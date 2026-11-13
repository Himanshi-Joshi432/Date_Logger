const { test, before, after, beforeEach, describe } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');

before(h.start);
after(h.stop);
beforeEach(h.resetDb);

describe('auth', () => {
    test('register never returns the password hash and normalises email', async () => {
        const res = await h.api('POST', '/api/auth/register', {
            json: { email: '  Mixed.Case@Example.com ', password: 'secret123' },
        });
        assert.equal(res.status, 201);
        assert.equal(res.body.user.email, 'mixed.case@example.com');
        assert.equal(res.body.user.password, undefined);

        const dup = await h.api('POST', '/api/auth/register', {
            json: { email: 'mixed.case@example.com', password: 'secret123' },
        });
        assert.equal(dup.status, 409);
    });

    test('login gives the same answer for unknown email and wrong password', async () => {
        const user = await h.createUser();
        const wrong = await h.api('POST', '/api/auth/login', { json: { email: user.email, password: 'nope-nope' } });
        const unknown = await h.api('POST', '/api/auth/login', { json: { email: 'ghost@example.com', password: 'nope-nope' } });
        assert.equal(wrong.status, 401);
        assert.equal(unknown.status, 401);
        assert.equal(wrong.body.message, unknown.body.message);

        const ok = await h.api('POST', '/api/auth/login', { json: { email: user.email.toUpperCase(), password: user.password } });
        assert.equal(ok.status, 200);
        assert.ok(ok.body.token);
    });

    test('an object in place of the email cannot be used to match any account', async () => {
        await h.createUser();
        const res = await h.api('POST', '/api/auth/login', { json: { email: { $ne: null }, password: 'secret123' } });
        assert.equal(res.status, 400);
    });

    test('protected routes reject missing and invalid tokens', async () => {
        assert.equal((await h.api('GET', '/api/post/posts')).status, 401);
        assert.equal((await h.api('GET', '/api/post/posts', { token: 'garbage' })).status, 401);
        assert.equal((await h.api('GET', '/api/ideas', { token: 'garbage' })).status, 401);
    });
});

describe('post ownership', () => {
    test('a stranger cannot see, read, edit or delete someone else\'s post', async () => {
        const alice = await h.createUser();
        const mallory = await h.createUser();
        const post = await h.createPost(alice);

        const list = await h.api('GET', '/api/post/posts', { token: mallory.token });
        assert.equal(list.body.posts.length, 0);

        assert.equal((await h.api('GET', `/api/post/${post._id}`, { token: mallory.token })).status, 404);
        assert.equal((await h.api('PUT', `/api/post/${post._id}`, { token: mallory.token, json: { venue: 'Hacked' } })).status, 404);
        assert.equal((await h.api('DELETE', `/api/post/delete/${post._id}`, { token: mallory.token })).status, 404);

        const still = await h.api('GET', `/api/post/${post._id}`, { token: alice.token });
        assert.equal(still.status, 200);
        assert.equal(still.body.post.venue, 'Luna Bistro');
    });

    test('owner can edit and delete; delete removes stored files', async () => {
        const alice = await h.createUser();
        const post = await h.createPost(alice, {}, { photos: 2 });
        assert.equal(post.images.length, 2);
        assert.equal(post.fileIds, undefined, 'storage ids are not exposed to clients');

        const edit = await h.api('PUT', `/api/post/${post._id}`, { token: alice.token, json: { venue: 'New Place', rating: 4 } });
        assert.equal(edit.status, 200);
        assert.equal(edit.body.post.venue, 'New Place');
        assert.equal(edit.body.post.rating, 4);

        const del = await h.api('DELETE', `/api/post/delete/${post._id}`, { token: alice.token });
        assert.equal(del.status, 200);
        assert.equal(h.deleted.length, 2);
        assert.equal((await h.api('DELETE', `/api/post/delete/${post._id}`, { token: alice.token })).status, 404);
    });

    test('malformed ids are a 404, not a server error', async () => {
        const alice = await h.createUser();
        assert.equal((await h.api('GET', '/api/post/not-an-id', { token: alice.token })).status, 404);
        assert.equal((await h.api('DELETE', '/api/post/delete/not-an-id', { token: alice.token })).status, 404);
    });
});

describe('post content', () => {
    test('a post needs a photo, and only images are accepted', async () => {
        const alice = await h.createUser();
        const none = await h.api('POST', '/api/post/add', { token: alice.token, form: h.photoForm({ venue: 'X' }, { photos: 0 }) });
        assert.equal(none.status, 400);

        const html = await h.api('POST', '/api/post/add', {
            token: alice.token,
            form: h.photoForm({ venue: 'X' }, { photos: 1, type: 'text/html' }),
        });
        assert.equal(html.status, 400);
        assert.equal(h.uploaded.length, 0);
    });

    test('old web clients sending the first photo twice do not create a duplicate', async () => {
        const alice = await h.createUser();
        const form = h.photoForm({ venue: 'Dup test', date: '2025-01-01' }, { photos: 2 });
        form.append('image', new Blob(['img0'], { type: 'image/jpeg' }), 'photo0.jpg');
        const res = await h.api('POST', '/api/post/add', { token: alice.token, form });
        assert.equal(res.status, 200);
        assert.equal(res.body.post.images.length, 2);
    });

    test('rating must be 1-5; mood, category and song details are saved', async () => {
        const alice = await h.createUser();
        const bad = await h.api('POST', '/api/post/add', { token: alice.token, form: h.photoForm({ venue: 'X', rating: '9' }) });
        assert.equal(bad.status, 400);
        assert.equal(h.deleted.length, 0);

        const post = await h.createPost(alice, {
            rating: '5',
            mood: 'Romantic',
            category: 'Dinner',
            music: JSON.stringify({
                audioUrl: 'https://cdn.example.com/p.mp3',
                title: 'Yellow',
                artist: 'Coldplay',
                source: 'deezer',
                trackId: 3135556,
            }),
        });
        assert.equal(post.rating, 5);
        assert.equal(post.mood, 'Romantic');
        assert.equal(post.category, 'Dinner');
        assert.equal(post.music.trackId, '3135556');
        assert.equal(post.music.source, 'deezer');
    });

    test('non-http song and image links are rejected', async () => {
        const alice = await h.createUser();
        const res = await h.api('POST', '/api/post/add', {
            token: alice.token,
            form: h.photoForm({ venue: 'X', music: JSON.stringify({ audioUrl: 'javascript:alert(1)' }) }),
        });
        assert.equal(res.status, 400);
    });

    test('editing can remove the song, remove photos and add photos', async () => {
        const alice = await h.createUser();
        const post = await h.createPost(alice, { audioUrl: 'https://cdn.example.com/p.mp3', songTitle: 'Yellow' }, { photos: 3 });
        assert.equal(post.music.audioUrl, 'https://cdn.example.com/p.mp3');

        const noSong = await h.api('PUT', `/api/post/${post._id}`, { token: alice.token, json: { music: null } });
        assert.equal(noSong.body.post.music.audioUrl, null);

        const fewer = await h.api('PUT', `/api/post/${post._id}`, {
            token: alice.token,
            json: { removeImages: [post.images[0]] },
        });
        assert.deepEqual(fewer.body.post.images, [post.images[1], post.images[2]]);
        assert.equal(fewer.body.post.image, post.images[1]);

        const form = h.photoForm({ removeImages: JSON.stringify([post.images[1], post.images[2]]) }, { photos: 1 });
        const swapped = await h.api('PUT', `/api/post/${post._id}`, { token: alice.token, form });
        assert.equal(swapped.status, 200);
        assert.equal(swapped.body.post.images.length, 1);

        const empty = await h.api('PUT', `/api/post/${post._id}`, {
            token: alice.token,
            json: { removeImages: swapped.body.post.images },
        });
        assert.equal(empty.status, 400, 'cannot remove the last photo');
    });

    test('pagination returns a page and a total', async () => {
        const alice = await h.createUser();
        for (let i = 1; i <= 3; i++) await h.createPost(alice, { venue: `Place ${i}`, date: `2025-01-0${i}` });
        const page = await h.api('GET', '/api/post/posts?limit=2&page=1', { token: alice.token });
        assert.equal(page.body.posts.length, 2);
        assert.equal(page.body.posts[0].venue, 'Place 3');
        assert.deepEqual(page.body.pagination, { page: 1, limit: 2, total: 3, hasMore: true });
        const all = await h.api('GET', '/api/post/posts', { token: alice.token });
        assert.equal(all.body.posts.length, 3);
    });
});

describe('partner linking', () => {
    async function link(a, b) {
        const invite = await h.api('POST', '/api/couple/invite', { token: a.token });
        assert.equal(invite.status, 200);
        const join = await h.api('POST', '/api/couple/join', { token: b.token, json: { code: invite.body.invite.code } });
        assert.equal(join.status, 200);
        return invite.body.invite.code;
    }

    test('linked partners share posts; unlinking separates them again', async () => {
        const alice = await h.createUser();
        const bob = await h.createUser();
        const mallory = await h.createUser();
        const alicePost = await h.createPost(alice, { venue: 'Alice pick' });
        await h.createPost(bob, { venue: 'Bob pick' });

        await link(alice, bob);

        const bobList = await h.api('GET', '/api/post/posts', { token: bob.token });
        assert.equal(bobList.body.posts.length, 2);
        assert.equal((await h.api('GET', `/api/post/${alicePost._id}`, { token: bob.token })).status, 200);
        assert.equal((await h.api('GET', '/api/post/posts', { token: mallory.token })).body.posts.length, 0);

        const me = await h.api('GET', '/api/auth/me', { token: bob.token });
        assert.equal(me.body.user.partner.email, alice.email);

        // Partner may edit a shared memory but only its creator may delete it.
        const edit = await h.api('PUT', `/api/post/${alicePost._id}`, { token: bob.token, json: { description: 'Loved it' } });
        assert.equal(edit.status, 200);
        assert.equal((await h.api('DELETE', `/api/post/delete/${alicePost._id}`, { token: bob.token })).status, 404);

        const unlink = await h.api('DELETE', '/api/couple', { token: bob.token });
        assert.equal(unlink.status, 200);
        assert.equal((await h.api('GET', '/api/post/posts', { token: bob.token })).body.posts.length, 1);
        assert.equal((await h.api('GET', '/api/post/posts', { token: alice.token })).body.posts.length, 1);
        assert.equal((await h.api('GET', `/api/post/${alicePost._id}`, { token: bob.token })).status, 404);
    });

    test('invite codes are single-use, cannot be self-used, and a third person cannot join a couple', async () => {
        const alice = await h.createUser();
        const bob = await h.createUser();
        const carol = await h.createUser();

        const invite = await h.api('POST', '/api/couple/invite', { token: alice.token });
        const code = invite.body.invite.code;
        assert.match(code, /^[A-Z2-9]{6}$/);

        assert.equal((await h.api('POST', '/api/couple/join', { token: alice.token, json: { code } })).status, 400);
        assert.equal((await h.api('POST', '/api/couple/join', { token: bob.token, json: { code: 'ZZZZZZ' } })).status, 404);
        assert.equal((await h.api('POST', '/api/couple/join', { token: bob.token, json: { code: code.toLowerCase() } })).status, 200);
        assert.equal((await h.api('POST', '/api/couple/join', { token: carol.token, json: { code } })).status, 404);
        assert.equal((await h.api('POST', '/api/couple/invite', { token: alice.token })).status, 409);
    });
});

describe('bucket list', () => {
    test('ideas are private to the couple and either partner can tick them off', async () => {
        const alice = await h.createUser();
        const bob = await h.createUser();
        const mallory = await h.createUser();

        const created = await h.api('POST', '/api/ideas', { token: alice.token, json: { title: '  Stargazing picnic  ' } });
        assert.equal(created.status, 201);
        const idea = created.body.ideas[0];
        assert.equal(idea.title, 'Stargazing picnic');

        assert.equal((await h.api('GET', '/api/ideas', { token: bob.token })).body.ideas.length, 0);
        assert.equal((await h.api('PATCH', `/api/ideas/${idea._id}`, { token: mallory.token, json: { completed: true } })).status, 404);
        assert.equal((await h.api('DELETE', `/api/ideas/${idea._id}`, { token: mallory.token })).status, 404);

        const invite = await h.api('POST', '/api/couple/invite', { token: alice.token });
        await h.api('POST', '/api/couple/join', { token: bob.token, json: { code: invite.body.invite.code } });

        assert.equal((await h.api('GET', '/api/ideas', { token: bob.token })).body.ideas.length, 1);
        const done = await h.api('PATCH', `/api/ideas/${idea._id}`, { token: bob.token, json: { completed: true } });
        assert.equal(done.body.idea.completed, true);

        const bulk = await h.api('POST', '/api/ideas', {
            token: bob.token,
            json: { ideas: [{ title: 'Pottery class' }, { title: '' }, { title: 'Night drive', completed: true }] },
        });
        assert.equal(bulk.body.ideas.length, 2);
        assert.equal((await h.api('GET', '/api/ideas', { token: alice.token })).body.ideas.length, 3);
        assert.equal((await h.api('POST', '/api/ideas', { token: alice.token, json: { title: '   ' } })).status, 400);
    });
});

describe('account deletion', () => {
    test('needs the right password, then removes the user, their posts, files and ideas', async () => {
        const alice = await h.createUser();
        const bob = await h.createUser();
        const invite = await h.api('POST', '/api/couple/invite', { token: alice.token });
        await h.api('POST', '/api/couple/join', { token: bob.token, json: { code: invite.body.invite.code } });

        await h.createPost(alice, {}, { photos: 2 });
        const bobPost = await h.createPost(bob);
        await h.api('POST', '/api/ideas', { token: alice.token, json: { title: 'Alice idea' } });
        await h.api('POST', '/api/ideas', { token: bob.token, json: { title: 'Bob idea' } });

        assert.equal((await h.api('DELETE', '/api/auth/me', { token: alice.token, json: {} })).status, 400);
        assert.equal((await h.api('DELETE', '/api/auth/me', { token: alice.token, json: { password: 'wrong' } })).status, 403);

        const del = await h.api('POST', '/api/auth/delete-account', { token: alice.token, json: { password: alice.password } });
        assert.equal(del.status, 200);
        assert.equal(h.deleted.length, 2);

        // The old token no longer works anywhere.
        assert.equal((await h.api('GET', '/api/auth/me', { token: alice.token })).status, 401);
        assert.equal((await h.api('GET', '/api/post/posts', { token: alice.token })).status, 401);
        assert.equal((await h.api('POST', '/api/auth/login', { json: { email: alice.email, password: alice.password } })).status, 401);

        // The partner keeps their own data and is unlinked.
        const bobPosts = await h.api('GET', '/api/post/posts', { token: bob.token });
        assert.deepEqual(bobPosts.body.posts.map((p) => p._id), [bobPost._id]);
        const bobIdeas = await h.api('GET', '/api/ideas', { token: bob.token });
        assert.deepEqual(bobIdeas.body.ideas.map((i) => i.title), ['Bob idea']);
        assert.equal((await h.api('GET', '/api/auth/me', { token: bob.token })).body.user.partner, null);
    });
});

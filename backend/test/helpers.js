// Shared test harness: in-memory MongoDB, a stubbed storage service, and a tiny HTTP client.
const path = require('node:path');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = 'test-secret';
process.env.IMAGEKIT_PUBLIC_KEY = 'public_test';
process.env.IMAGEKIT_PRIVATE_KEY = 'private_test';

// Replace the ImageKit-backed storage service so tests never touch the network.
const storagePath = path.resolve(__dirname, '../src/services/storage.services.js');
const realStorage = require(storagePath);
const uploaded = [];
const deleted = [];
let nextFileId = 1;

async function fakeUpload(file) {
    const fileId = `file_${nextFileId++}`;
    const record = { fileId, url: `https://ik.test/${fileId}/${file.originalname || 'upload'}` };
    uploaded.push(record);
    return record;
}
async function fakeDeleteFiles(ids = []) {
    deleted.push(...ids.filter(Boolean));
}
const stub = fakeUpload;
stub.uploadImage = fakeUpload;
stub.uploadFile = fakeUpload;
stub.deleteFiles = fakeDeleteFiles;
stub.deleteFilesByUrl = async () => {};
stub.deletePostFiles = async (post) => fakeDeleteFiles(post.fileIds || []);
stub.upload = realStorage.upload; // keep the real multer config (limits + file-type filter)
stub.imageKit = {};
require.cache[storagePath].exports = stub;

const app = require('../src/app');

let mongod;
let server;
let baseUrl;

async function start() {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    await new Promise((resolve) => {
        server = app.listen(0, '127.0.0.1', resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
}

async function stop() {
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    await mongod.stop();
}

async function resetDb() {
    const collections = await mongoose.connection.db.collections();
    await Promise.all(collections.map((c) => c.deleteMany({})));
    uploaded.length = 0;
    deleted.length = 0;
}

async function api(method, url, { token, json, form } = {}) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    let body;
    if (json !== undefined) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(json);
    } else if (form) {
        body = form;
    }
    const res = await fetch(baseUrl + url, { method, headers, body });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, body: data };
}

let userCounter = 0;
/** Registers and logs in a fresh user. Each gets a distinct fake IP so rate limits don't interfere. */
async function createUser(password = 'secret123') {
    const email = `user${++userCounter}_${Date.now()}@example.com`;
    const UserModel = require('../src/models/auth.model');
    const bcrypt = require('bcrypt');
    const jwt = require('jsonwebtoken');
    const user = await UserModel.create({ email, password: await bcrypt.hash(password, 4) });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    return { id: String(user._id), email, password, token };
}

function photoForm(fields = {}, { photos = 1, type = 'image/jpeg' } = {}) {
    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) form.append(k, v);
    for (let i = 0; i < photos; i++) {
        form.append('images', new Blob([`img${i}`], { type }), `photo${i}.jpg`);
    }
    return form;
}

async function createPost(user, fields = {}, opts) {
    const res = await api('POST', '/api/post/add', {
        token: user.token,
        form: photoForm({ venue: 'Luna Bistro', date: '2025-02-14', ...fields }, opts),
    });
    if (res.status !== 200) throw new Error(`createPost failed: ${res.status} ${JSON.stringify(res.body)}`);
    return res.body.post;
}

module.exports = { start, stop, resetDb, api, createUser, createPost, photoForm, uploaded, deleted };

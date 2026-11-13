const mongoose = require("mongoose");
const postModel = require("../models/post.model");
const { uploadImage, deleteFiles, deletePostFiles } = require("../services/storage.services");

const MAX_PAGE_SIZE = 100;

function httpError(status, message) {
    const err = new Error(message);
    err.status = status;
    return err;
}

function isHttpUrl(value) {
    if (typeof value !== "string") return false;
    try {
        const u = new URL(value.trim());
        return u.protocol === "https:" || u.protocol === "http:";
    } catch {
        return false;
    }
}

function optionalString(value) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
}

function optionalUrl(value) {
    return isHttpUrl(value) ? value.trim() : null;
}

/** Returns a number 1-5, null to clear, or undefined if the field wasn't sent. */
function parseRating(value) {
    if (value === undefined) return undefined;
    if (value === null || value === "" || value === "null") return null;
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1 || n > 5) {
        throw httpError(400, "Rating must be a whole number from 1 to 5");
    }
    return n;
}

function parseDuration(body) {
    return Number(body.duration ?? body.Duration) || 15;
}

/** Collects image files. Older web clients sent the first photo under both
 *  `images` and `image`, so `image` is only used when `images` is empty. */
function collectImageFiles(req) {
    const images = req.files?.images || [];
    return images.length > 0 ? images : (req.files?.image || []);
}

function collectAudioFile(req) {
    return req.files?.audio?.[0] || req.files?.music?.[0] || null;
}

function collectDirectImageUrls(body) {
    let urls = [];
    if (body.images) {
        if (Array.isArray(body.images)) {
            urls = body.images;
        } else if (typeof body.images === "string") {
            try {
                const parsed = JSON.parse(body.images);
                urls = Array.isArray(parsed) ? parsed : [body.images];
            } catch {
                urls = [body.images];
            }
        }
    } else if (body.image) {
        urls = [body.image];
    }
    const invalid = urls.filter((u) => !isHttpUrl(u));
    if (invalid.length > 0) {
        throw httpError(400, "Image URLs must be http(s) links");
    }
    return urls.map((u) => u.trim());
}

/**
 * Works out the soundtrack from the request body.
 * Returns: an object to set, null to remove it, or undefined to leave it unchanged.
 */
function parseMusicFromBody(body, existing) {
    if (body.music === null || body.music === "null" || body.removeMusic === true || body.removeMusic === "true") {
        return null;
    }

    if (body.music) {
        let parsed = body.music;
        if (typeof parsed === "string") {
            try {
                parsed = JSON.parse(parsed);
            } catch {
                parsed = { audioUrl: parsed };
            }
        }
        const audioUrl = optionalUrl(parsed.audioUrl || parsed.preview || parsed.url);
        if (!audioUrl) throw httpError(400, "Soundtrack must be an http(s) link");
        return {
            audioUrl,
            title: optionalString(parsed.title),
            artist: optionalString(parsed.artist),
            albumCover: optionalUrl(parsed.albumCover),
            source: optionalString(parsed.source),
            trackId: parsed.trackId != null ? optionalString(String(parsed.trackId)) : null,
            startTime: Number(parsed.startTime) || 0,
            duration: Number(parsed.duration) || 15
        };
    }

    if (body.audioUrl) {
        const audioUrl = optionalUrl(body.audioUrl);
        if (!audioUrl) throw httpError(400, "Soundtrack must be an http(s) link");
        return {
            audioUrl,
            title: optionalString(body.songTitle) ?? existing?.title ?? null,
            artist: optionalString(body.songArtist) ?? existing?.artist ?? null,
            albumCover: optionalUrl(body.albumCover) ?? existing?.albumCover ?? null,
            source: optionalString(body.songSource),
            trackId: optionalString(body.songTrackId),
            startTime: Number(body.startTime) || 0,
            duration: parseDuration(body)
        };
    }

    return undefined;
}

function formatPost(post) {
    const p = post.toObject ? post.toObject() : { ...post };
    delete p.fileIds;
    if (!p.images || p.images.length === 0) {
        p.images = p.image ? [p.image] : [];
    }
    return p;
}

function assertValidId(id) {
    if (!mongoose.isValidObjectId(id)) {
        throw httpError(404, "Date log not found");
    }
}

function sendError(res, error, fallbackMessage) {
    if (error.status) {
        return res.status(error.status).json({ message: error.message });
    }
    if (error.name === "CastError" || error.name === "ValidationError") {
        return res.status(400).json({ message: `Invalid value for ${error.path || "a field"}` });
    }
    console.error(fallbackMessage, error);
    return res.status(500).json({ message: fallbackMessage });
}

async function createPost(req, res) {
    const userId = req.user.id;
    const uploadedFileIds = [];

    try {
        const imageFiles = collectImageFiles(req);
        const audioFile = collectAudioFile(req);
        const directImageUrls = imageFiles.length === 0 ? collectDirectImageUrls(req.body) : [];

        if (imageFiles.length === 0 && directImageUrls.length === 0) {
            return res.status(400).json({ message: "At least one image is required" });
        }

        const { venue, date, description, mood, category } = req.body;
        const rating = parseRating(req.body.rating);
        let music = audioFile ? undefined : parseMusicFromBody(req.body);

        const uploadResults = await Promise.all(imageFiles.map((file) => uploadImage(file)));
        uploadResults.forEach((r) => uploadedFileIds.push(r.fileId));
        const allImageUrls = [...uploadResults.map((r) => r.url), ...directImageUrls];

        if (audioFile) {
            const audioResult = await uploadImage(audioFile);
            uploadedFileIds.push(audioResult.fileId);
            music = {
                audioUrl: audioResult.url,
                startTime: Number(req.body.startTime) || 0,
                duration: parseDuration(req.body)
            };
        }

        const post = await postModel.create({
            images: allImageUrls,
            image: allImageUrls[0] || "",
            fileIds: uploadedFileIds,
            venue,
            description,
            date,
            music: music || undefined,
            rating: rating ?? undefined,
            mood: mood || undefined,
            category: category || undefined,
            createdBy: userId
        });

        await post.populate("createdBy", "email");

        return res.status(200).json({
            message: "post created successfully",
            post: formatPost(post)
        });
    } catch (error) {
        // Don't leave orphaned uploads behind if the post itself wasn't saved.
        if (uploadedFileIds.length > 0) deleteFiles(uploadedFileIds);
        return sendError(res, error, "Error uploading image/audio or creating post");
    }
}

async function getPosts(req, res) {
    try {
        const query = postModel
            .find({ createdBy: { $in: req.journalOwnerIds } })
            .populate("createdBy", "email")
            .sort({ date: -1, _id: -1 });

        // Optional pagination: ?page=1&limit=20. Without it, the full list is returned.
        const limit = Math.min(Number.parseInt(req.query.limit, 10) || 0, MAX_PAGE_SIZE);
        const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
        if (limit > 0) {
            query.skip((page - 1) * limit).limit(limit);
        }

        const [posts, total] = await Promise.all([
            query,
            limit > 0 ? postModel.countDocuments({ createdBy: { $in: req.journalOwnerIds } }) : null
        ]);

        const body = {
            message: "posts fetched successfully",
            posts: posts.map(formatPost)
        };
        if (limit > 0) {
            body.pagination = { page, limit, total, hasMore: page * limit < total };
        }
        return res.status(200).json(body);
    } catch (error) {
        return sendError(res, error, "Error fetching posts");
    }
}

async function getPostById(req, res) {
    try {
        assertValidId(req.params.id);
        const post = await postModel
            .findOne({ _id: req.params.id, createdBy: { $in: req.journalOwnerIds } })
            .populate("createdBy", "email");
        if (!post) {
            return res.status(404).json({ message: "Date log not found" });
        }

        return res.status(200).json({
            message: "post fetched successfully",
            post: formatPost(post)
        });
    } catch (error) {
        return sendError(res, error, "Error fetching post");
    }
}

async function deletePost(req, res) {
    try {
        assertValidId(req.params.id);
        const post = await postModel
            .findOneAndDelete({ _id: req.params.id, createdBy: req.user.id })
            .select("+fileIds");
        if (!post) {
            return res.status(404).json({ message: "Date log not found" });
        }

        // Clean up stored photos/audio in the background; the post is already gone.
        deletePostFiles(post);

        return res.status(200).json({ message: "post deleted successfully" });
    } catch (error) {
        return sendError(res, error, "Error deleting post");
    }
}

async function updatePost(req, res) {
    const newFileIds = [];

    try {
        assertValidId(req.params.id);
        // Either partner can edit a shared memory; only its creator can delete it.
        const post = await postModel
            .findOne({ _id: req.params.id, createdBy: { $in: req.journalOwnerIds } })
            .select("+fileIds");
        if (!post) {
            return res.status(404).json({ message: "Date log not found" });
        }

        const { venue, date, description, mood, category } = req.body;

        // Photos to take off this memory, sent as a JSON array (or repeated field) of their URLs.
        let removeImages = req.body.removeImages;
        if (typeof removeImages === "string") {
            try {
                removeImages = JSON.parse(removeImages);
            } catch {
                removeImages = [removeImages];
            }
        }
        if (Array.isArray(removeImages) && removeImages.length > 0) {
            const toRemove = new Set(removeImages.filter((u) => typeof u === "string"));
            const current = post.images?.length ? post.images : (post.image ? [post.image] : []);
            const remaining = current.filter((url) => !toRemove.has(url));
            if (remaining.length === 0 && collectImageFiles(req).length === 0) {
                throw httpError(400, "A memory needs at least one photo");
            }
            post.images = remaining;
            post.image = remaining[0] || "";
        }
        if (venue !== undefined) post.venue = venue;
        if (date !== undefined) post.date = date;
        if (description !== undefined) post.description = description;
        if (mood !== undefined) post.mood = mood || null;
        if (category !== undefined) post.category = category || null;
        const rating = parseRating(req.body.rating);
        if (rating !== undefined) post.rating = rating;

        const audioFile = collectAudioFile(req);
        const music = audioFile ? undefined : parseMusicFromBody(req.body, post.music);

        const imageFiles = collectImageFiles(req);
        if (imageFiles.length > 0) {
            const uploadResults = await Promise.all(imageFiles.map((file) => uploadImage(file)));
            uploadResults.forEach((r) => newFileIds.push(r.fileId));
            const newUrls = uploadResults.map((r) => r.url);
            post.images = [...(post.images || []), ...newUrls];
            if (!post.image) post.image = post.images[0];
        }

        if (audioFile) {
            const audioResult = await uploadImage(audioFile);
            newFileIds.push(audioResult.fileId);
            post.music = {
                audioUrl: audioResult.url,
                startTime: Number(req.body.startTime) || 0,
                duration: parseDuration(req.body)
            };
        } else if (music === null) {
            post.music = { audioUrl: null, title: null, artist: null, albumCover: null, source: null, trackId: null, startTime: 0, duration: 15 };
        } else if (music !== undefined) {
            post.music = music;
        }

        if (newFileIds.length > 0) {
            post.fileIds = [...(post.fileIds || []), ...newFileIds];
        }

        await post.save();
        await post.populate("createdBy", "email");
        return res.status(200).json({
            message: "post updated successfully",
            post: formatPost(post)
        });
    } catch (error) {
        if (newFileIds.length > 0) deleteFiles(newFileIds);
        return sendError(res, error, "Error updating post");
    }
}

module.exports = {
    createPost,
    updatePost,
    getPosts,
    getPostById,
    deletePost
};

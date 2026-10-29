const jwt = require("jsonwebtoken");
const postModel = require("../models/post.model");
const uploadImage = require("../services/storage.services");

function getAuthenticatedUserId(req) {
    if (req.user && (req.user.id || req.user._id)) {
        return req.user.id || req.user._id;
    }

    let token = req.headers.authorization || req.cookies?.token;
    if (!token) return null;

    if (token.startsWith("Bearer ")) {
        token = token.slice(7).trim();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        return decoded.id || decoded._id;
    } catch (err) {
        return null;
    }
}

async function createPost(req, res) {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
        return res.status(401).json({
            message: "Unauthorized: Invalid or missing token"
        });
    }

    try {
        // Collect all uploaded image files from 'images', 'image', or single 'file'
        const imageFiles = [
            ...(req.files?.images || []),
            ...(req.files?.image || []),
            ...(req.file ? [req.file] : [])
        ];
        const audioFile = req.files?.audio?.[0] || req.files?.music?.[0];

        // Also accept existing image URLs passed in req.body
        let directImageUrls = [];
        if (req.body.images) {
            if (Array.isArray(req.body.images)) {
                directImageUrls = req.body.images;
            } else if (typeof req.body.images === "string") {
                try {
                    const parsed = JSON.parse(req.body.images);
                    if (Array.isArray(parsed)) directImageUrls = parsed;
                    else directImageUrls = [req.body.images];
                } catch {
                    directImageUrls = [req.body.images];
                }
            }
        } else if (req.body.image && typeof req.body.image === "string" && req.body.image.startsWith("http")) {
            directImageUrls = [req.body.image];
        }

        if (imageFiles.length === 0 && directImageUrls.length === 0) {
            return res.status(400).json({
                message: "At least one image is required"
            });
        }

        // Upload all image files concurrently
        const uploadPromises = imageFiles.map((file) => uploadImage(file));
        const uploadResults = await Promise.all(uploadPromises);
        const uploadedUrls = uploadResults.map((r) => r.url);

        const allImageUrls = [...uploadedUrls, ...directImageUrls];

        const { venue, date, description, rating, mood, category } = req.body;

        let music = undefined;
        if (audioFile) {
            const audioResult = await uploadImage(audioFile);
            music = {
                audioUrl: audioResult.url,
                startTime: Number(req.body.startTime) || 0,
                duration: Number(req.body.duration ?? req.body.Duration) || 15
            };
        } else if (req.body.music) {
            try {
                const parsed = typeof req.body.music === 'string' ? JSON.parse(req.body.music) : req.body.music;
                music = {
                    audioUrl: parsed.audioUrl || parsed.preview || parsed.url,
                    title: parsed.title || null,
                    artist: parsed.artist || null,
                    albumCover: parsed.albumCover || null,
                    startTime: Number(parsed.startTime) || 0,
                    duration: Number(parsed.duration) || 15
                };
            } catch (e) {
                music = { audioUrl: req.body.music, duration: 15 };
            }
        } else if (req.body.audioUrl) {
            music = {
                audioUrl: req.body.audioUrl.trim(),
                title: req.body.songTitle || undefined,
                artist: req.body.songArtist || undefined,
                albumCover: req.body.albumCover || undefined,
                startTime: Number(req.body.startTime) || 0,
                duration: Number(req.body.duration ?? req.body.Duration) || 15
            };
        }

        const post = await postModel.create({
            images: allImageUrls,
            image: allImageUrls[0] || "",
            venue,
            description,
            date,
            music,
            rating: rating ? Number(rating) : undefined,
            mood: mood || undefined,
            category: category || undefined,
            createdBy: userId
        });

        const populatedPost = await post.populate("createdBy", "email");

        return res.status(200).json({
            message: "post created successfully",
            post: populatedPost
        });
    } catch (error) {
        console.error("Error creating post:", error);
        return res.status(500).json({
            message: "Error uploading image/audio or creating post",
            error: error.message
        });
    }
}

async function getPosts(req, res) {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
        return res.status(401).json({
            message: "Unauthorized"
        });
    }

    try {
        const posts = await postModel.find().populate("createdBy", "email").sort({ date: -1, _id: -1 });
        const formattedPosts = posts.map((post) => {
            const p = post.toObject ? post.toObject() : { ...post };
            if (!p.images || p.images.length === 0) {
                p.images = p.image ? [p.image] : [];
            }
            return p;
        });

        return res.status(200).json({
            message: "posts fetched successfully",
            posts: formattedPosts
        });
    } catch (error) {
        console.error("Error fetching posts:", error);
        return res.status(500).json({
            message: "Error fetching posts",
            error: error.message
        });
    }
}

async function getPostById(req, res) {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
        return res.status(401).json({
            message: "Unauthorized"
        });
    }

    try {
        const post = await postModel.findById(req.params.id).populate("createdBy", "email");
        if (!post) {
            return res.status(404).json({
                message: "Date log not found"
            });
        }

        const p = post.toObject ? post.toObject() : { ...post };
        if (!p.images || p.images.length === 0) {
            p.images = p.image ? [p.image] : [];
        }

        return res.status(200).json({
            message: "post fetched successfully",
            post: p
        });
    } catch (error) {
        console.error("Error fetching post:", error);
        return res.status(500).json({
            message: "Error fetching post",
            error: error.message
        });
    }
}

async function deletePost(req, res) {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
        return res.status(401).json({
            message: "Unauthorized"
        });
    }

    try {
        const id = req.params.id;
        await postModel.findByIdAndDelete(id);
        return res.status(200).json({
            message: "post deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting post:", error);
        return res.status(500).json({
            message: "Error deleting post",
            error: error.message
        });
    }
}

async function updatePost(req, res) {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
        return res.status(401).json({
            message: "Unauthorized"
        });
    }

    try {
        const id = req.params.id;
        const post = await postModel.findById(id);
        if (!post) {
            return res.status(404).json({ message: "Date log not found" });
        }

        const { venue, date, description, rating, mood, category } = req.body;
        if (venue !== undefined) post.venue = venue;
        if (date !== undefined) post.date = date;
        if (description !== undefined) post.description = description;
        if (rating !== undefined) post.rating = rating ? Number(rating) : null;
        if (mood !== undefined) post.mood = mood;
        if (category !== undefined) post.category = category;

        const imageFiles = [
            ...(req.files?.images || []),
            ...(req.files?.image || []),
            ...(req.file ? [req.file] : [])
        ];
        if (imageFiles.length > 0) {
            const uploadPromises = imageFiles.map((file) => uploadImage(file));
            const uploadResults = await Promise.all(uploadPromises);
            const newUploadedUrls = uploadResults.map((r) => r.url);
            post.images = [...(post.images || []), ...newUploadedUrls];
            if (!post.image) post.image = newUploadedUrls[0];
        }

        const audioFile = req.files?.audio?.[0] || req.files?.music?.[0];
        if (audioFile) {
            const audioResult = await uploadImage(audioFile);
            post.music = {
                audioUrl: audioResult.url,
                startTime: Number(req.body.startTime) || 0,
                duration: Number(req.body.duration ?? req.body.Duration) || 15
            };
        } else if (req.body.music) {
            try {
                const parsed = typeof req.body.music === 'string' ? JSON.parse(req.body.music) : req.body.music;
                post.music = {
                    audioUrl: parsed.audioUrl || parsed.preview || parsed.url,
                    title: parsed.title || null,
                    artist: parsed.artist || null,
                    albumCover: parsed.albumCover || null,
                    startTime: Number(parsed.startTime) || 0,
                    duration: Number(parsed.duration) || 15
                };
            } catch (e) {
                post.music = { audioUrl: req.body.music, duration: 15 };
            }
        } else if (req.body.audioUrl) {
            post.music = {
                audioUrl: req.body.audioUrl.trim(),
                title: req.body.songTitle || post.music?.title,
                artist: req.body.songArtist || post.music?.artist,
                albumCover: req.body.albumCover || post.music?.albumCover,
                startTime: Number(req.body.startTime) || 0,
                duration: Number(req.body.duration ?? req.body.Duration) || 15
            };
        }

        await post.save();
        const populated = await post.populate("createdBy", "email");
        return res.status(200).json({
            message: "post updated successfully",
            post: populated
        });
    } catch (error) {
        console.error("Error updating post:", error);
        return res.status(500).json({
            message: "Error updating post",
            error: error.message
        });
    }
}

module.exports = {
    createPost,
    updatePost,
    getPosts,
    getPostById,
    deletePost
};

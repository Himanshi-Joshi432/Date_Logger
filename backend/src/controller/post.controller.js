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
        if (!req.file) {
            return res.status(400).json({
                message: "Image is required"
            });
        }

        const result = await uploadImage(req.file);
        const { venue, date } = req.body;

        const post = await postModel.create({
            image: result.url,
            venue,
            date,
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
            message: "Error uploading image or creating post",
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
        const posts = await postModel.find().populate("createdBy", "email");
        return res.status(200).json({
            message: "posts fetched successfully",
            posts
        });
    } catch (error) {
        console.error("Error fetching posts:", error);
        return res.status(500).json({
            message: "Error fetching posts",
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

module.exports = {
    createPost,
    getPosts,
    deletePost
};



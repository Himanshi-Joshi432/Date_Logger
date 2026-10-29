const mongoose = require('mongoose');
require('./auth.model');
const postSchema = new mongoose.Schema({
    date: Date,
    venue: String,   
    description: String,
    image: String,
    images: {
        type: [String],
        default: []
    },
    music: {
        audioUrl: {
            type: String,
            default: null
        },
        title: {
            type: String,
            default: null
        },
        artist: {
            type: String,
            default: null
        },
        albumCover: {
            type: String,
            default: null
        },
        startTime: {
            type: Number, // in seconds
            default: 0
        },
        duration: {
            type: Number, // in seconds (e.g. 15)
            default: 15
        }
    },
    rating: {
        type: Number,
        default: null
    },
    mood: {
        type: String,
        default: null
    },
    category: {
        type: String,
        default: null
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, { timestamps: true });

const postModel = mongoose.model("post", postSchema);

module.exports = postModel;

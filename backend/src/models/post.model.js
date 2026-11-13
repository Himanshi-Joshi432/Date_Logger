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
    // ImageKit file IDs for everything this post uploaded, so deleting the post can remove them.
    // Posts created before this field existed have none; their files are left in ImageKit.
    fileIds: {
        type: [String],
        default: [],
        select: false
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
        // Catalogue the song came from ('deezer' | 'itunes') and its id there,
        // so clients can fetch a fresh preview link when a saved one expires.
        source: {
            type: String,
            default: null
        },
        trackId: {
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
        min: 1,
        max: 5,
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

postSchema.index({ createdBy: 1, date: -1, _id: -1 });

const postModel = mongoose.model("post", postSchema);

module.exports = postModel;

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
        startTime: {
            type: Number, // in seconds (e.g., 30 for 0:30)
            default: 0
        },
        duration: {       // (or Duration if you prefer capital D)
            type: Number, // in seconds (e.g., 15 or 30)
            default: 30
        }
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, { timestamps: true });

const postModel = mongoose.model("post", postSchema);

module.exports = postModel;

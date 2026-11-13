const mongoose = require('mongoose');
require('./auth.model');

// A bucket-list date idea. Visible to its creator and their linked partner.
const ideaSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
    },
    completed: {
        type: Boolean,
        default: false,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
}, { timestamps: true });

module.exports = mongoose.model('idea', ideaSchema);

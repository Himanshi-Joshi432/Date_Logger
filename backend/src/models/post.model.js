const mongoose = require('mongoose');
require('./auth.model');

const postSchema = new mongoose.Schema({
    date: Date,
    venue: String,   
    image: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
});

const postModel = mongoose.model("post", postSchema);

module.exports = postModel;

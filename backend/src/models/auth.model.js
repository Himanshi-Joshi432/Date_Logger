const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    // The other half of the couple. Linked accounts share one journal and bucket list.
    partner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    // Short-lived code this user can give their partner to link accounts.
    inviteCode: {
        type: String,
        default: null,
        index: true,
    },
    inviteCodeExpiresAt: {
        type: Date,
        default: null,
    },
}, { timestamps: true });

const UserModel = mongoose.model('User', userSchema);

module.exports = UserModel;

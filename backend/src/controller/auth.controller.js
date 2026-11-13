const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/auth.model');
const postModel = require('../models/post.model');
const ideaModel = require('../models/idea.model');
const { deletePostFiles } = require('../services/storage.services');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 72; // bcrypt ignores bytes beyond 72

function normalizeEmail(email) {
    return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function publicUser(user) {
    return {
        id: user._id,
        email: user.email,
    };
}

async function register(req, res) {
    try {
        const email = normalizeEmail(req.body?.email);
        const password = req.body?.password;

        if (!email || typeof password !== 'string' || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        if (!EMAIL_RE.test(email)) {
            return res.status(400).json({ message: 'Please enter a valid email address' });
        }
        if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
            return res.status(400).json({
                message: `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`
            });
        }

        const existing = await UserModel.findOne({ email });
        if (existing) {
            return res.status(409).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await UserModel.create({ email, password: hashedPassword });

        return res.status(201).json({
            message: 'User registered successfully',
            user: publicUser(user)
        });
    } catch (error) {
        // Unique index race: two registrations with the same email at once
        if (error && error.code === 11000) {
            return res.status(409).json({ message: 'User already exists' });
        }
        console.error('Register error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function login(req, res) {
    try {
        const email = normalizeEmail(req.body?.email);
        const password = req.body?.password;

        if (!email || typeof password !== 'string' || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Accounts created before emails were normalised may be stored with capitals.
        let user = await UserModel.findOne({ email });
        if (!user && typeof req.body.email === 'string' && req.body.email.trim() !== email) {
            user = await UserModel.findOne({ email: req.body.email.trim() });
        }

        // Same response for unknown email and wrong password, so emails can't be probed.
        const isPasswordValid = user ? await bcrypt.compare(password, user.password) : false;
        if (!user || !isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        return res.status(200).json({
            message: 'User Login successful',
            token,
            user: publicUser(user)
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function me(req, res) {
    try {
        const user = await UserModel.findById(req.user.id).select('email partner');
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized: User no longer exists' });
        }
        let partner = null;
        if (user.partner) {
            const p = await UserModel.findById(user.partner).select('email');
            if (p) partner = { id: p._id, email: p.email };
        }
        return res.status(200).json({ user: { ...publicUser(user), partner } });
    } catch (error) {
        console.error('Me error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

/**
 * Permanently deletes the account and everything it created:
 * date logs, their photos/audio in storage, and bucket-list ideas.
 * Requires the password again so a stolen session cannot wipe an account.
 */
async function deleteAccount(req, res) {
    try {
        const password = req.body?.password;
        if (typeof password !== 'string' || !password) {
            return res.status(400).json({ message: 'Please enter your password to delete your account' });
        }

        const user = await UserModel.findById(req.user.id);
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized: User no longer exists' });
        }
        if (!(await bcrypt.compare(password, user.password))) {
            return res.status(403).json({ message: 'Incorrect password' });
        }

        const posts = await postModel.find({ createdBy: user._id }).select('+fileIds');

        await postModel.deleteMany({ createdBy: user._id });
        await ideaModel.deleteMany({ createdBy: user._id });
        if (user.partner) {
            await UserModel.updateOne({ _id: user.partner, partner: user._id }, { partner: null });
        }
        await UserModel.deleteOne({ _id: user._id });

        // Storage cleanup runs after the response; failures are logged, not fatal.
        Promise.allSettled(posts.map((p) => deletePostFiles(p)));

        return res.status(200).json({ message: 'Your account and all its data have been deleted' });
    } catch (error) {
        console.error('Delete account error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function logout(req, res) {
    // Tokens are stateless bearer tokens held by the client; nothing to clear server-side.
    return res.status(200).json({ message: 'User Logout Successfully' });
}

module.exports = {
    login,
    register,
    logout,
    me,
    deleteAccount
};

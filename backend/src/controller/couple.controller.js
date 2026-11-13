const crypto = require('crypto');
const UserModel = require('../models/auth.model');

const INVITE_TTL_MS = 24 * 60 * 60 * 1000;
// No 0/O/1/I so codes are easy to read aloud and type.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

function generateCode() {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
        code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
    }
    return code;
}

async function describeCouple(user) {
    let partner = null;
    if (user.partner) {
        const p = await UserModel.findById(user.partner).select('email');
        if (p) partner = { id: p._id, email: p.email };
    }
    const hasLiveInvite = user.inviteCode && user.inviteCodeExpiresAt && user.inviteCodeExpiresAt > new Date();
    return {
        partner,
        invite: !partner && hasLiveInvite
            ? { code: user.inviteCode, expiresAt: user.inviteCodeExpiresAt }
            : null,
    };
}

async function getCouple(req, res) {
    try {
        const user = await UserModel.findById(req.user.id);
        if (!user) return res.status(401).json({ message: 'Unauthorized: User no longer exists' });
        return res.status(200).json(await describeCouple(user));
    } catch (error) {
        console.error('Get couple error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

/** Creates (or refreshes) an invite code for this user to share with their partner. */
async function createInvite(req, res) {
    try {
        const user = await UserModel.findById(req.user.id);
        if (!user) return res.status(401).json({ message: 'Unauthorized: User no longer exists' });
        if (user.partner) {
            return res.status(409).json({ message: 'You are already linked with a partner' });
        }

        user.inviteCode = generateCode();
        user.inviteCodeExpiresAt = new Date(Date.now() + INVITE_TTL_MS);
        await user.save();

        return res.status(200).json(await describeCouple(user));
    } catch (error) {
        console.error('Create invite error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

/** Links this user with whoever created the given invite code. */
async function joinWithCode(req, res) {
    try {
        const code = typeof req.body?.code === 'string' ? req.body.code.trim().toUpperCase() : '';
        if (code.length !== CODE_LENGTH) {
            return res.status(400).json({ message: 'Please enter the 6-character invite code' });
        }

        const me = await UserModel.findById(req.user.id);
        if (!me) return res.status(401).json({ message: 'Unauthorized: User no longer exists' });
        if (me.partner) {
            return res.status(409).json({ message: 'You are already linked with a partner' });
        }

        const inviter = await UserModel.findOne({
            inviteCode: code,
            inviteCodeExpiresAt: { $gt: new Date() },
        });
        if (!inviter) {
            return res.status(404).json({ message: 'That code is invalid or has expired' });
        }
        if (String(inviter._id) === String(me._id)) {
            return res.status(400).json({ message: "That's your own code. Share it with your partner instead." });
        }
        if (inviter.partner) {
            return res.status(409).json({ message: 'That person is already linked with someone' });
        }

        // Claim the inviter atomically so two people can't join with the same code.
        const claimed = await UserModel.findOneAndUpdate(
            { _id: inviter._id, partner: null, inviteCode: code },
            { partner: me._id, inviteCode: null, inviteCodeExpiresAt: null }
        );
        if (!claimed) {
            return res.status(409).json({ message: 'That code was just used. Ask for a new one.' });
        }

        me.partner = inviter._id;
        me.inviteCode = null;
        me.inviteCodeExpiresAt = null;
        await me.save();

        return res.status(200).json({
            message: 'You are now linked. Your journals are shared.',
            ...(await describeCouple(me)),
        });
    } catch (error) {
        console.error('Join couple error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

/** Unlinks both partners. Each keeps their own posts and ideas. */
async function unlink(req, res) {
    try {
        const me = await UserModel.findById(req.user.id);
        if (!me) return res.status(401).json({ message: 'Unauthorized: User no longer exists' });

        if (me.partner) {
            await UserModel.updateOne({ _id: me.partner, partner: me._id }, { partner: null });
            me.partner = null;
        }
        me.inviteCode = null;
        me.inviteCodeExpiresAt = null;
        await me.save();

        return res.status(200).json({ message: 'Unlinked', partner: null, invite: null });
    } catch (error) {
        console.error('Unlink error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = { getCouple, createInvite, joinWithCode, unlink };

const mongoose = require('mongoose');
const ideaModel = require('../models/idea.model');

const MAX_IDEAS_PER_REQUEST = 100;

function cleanTitle(value) {
    return typeof value === 'string' ? value.trim().slice(0, 200) : '';
}

async function listIdeas(req, res) {
    try {
        const ideas = await ideaModel
            .find({ createdBy: { $in: req.journalOwnerIds } })
            .sort({ createdAt: -1, _id: -1 });
        return res.status(200).json({ ideas });
    } catch (error) {
        console.error('List ideas error:', error);
        return res.status(500).json({ message: 'Error fetching ideas' });
    }
}

/** Creates one idea ({title}) or several ({ideas: [{title, completed}]}), e.g. when importing a local list. */
async function createIdeas(req, res) {
    try {
        const incoming = Array.isArray(req.body?.ideas) ? req.body.ideas : [req.body || {}];
        const docs = incoming
            .slice(0, MAX_IDEAS_PER_REQUEST)
            .map((i) => ({
                title: cleanTitle(i.title),
                completed: i.completed === true,
                createdBy: req.user.id,
            }))
            .filter((i) => i.title);

        if (docs.length === 0) {
            return res.status(400).json({ message: 'An idea needs a title' });
        }

        const ideas = await ideaModel.insertMany(docs);
        return res.status(201).json({ ideas });
    } catch (error) {
        console.error('Create idea error:', error);
        return res.status(500).json({ message: 'Error saving idea' });
    }
}

/** Either partner can tick off or rename a shared idea. */
async function updateIdea(req, res) {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ message: 'Idea not found' });
        }
        const changes = {};
        if (typeof req.body?.completed === 'boolean') changes.completed = req.body.completed;
        if (req.body?.title !== undefined) {
            const title = cleanTitle(req.body.title);
            if (!title) return res.status(400).json({ message: 'An idea needs a title' });
            changes.title = title;
        }

        const idea = await ideaModel.findOneAndUpdate(
            { _id: req.params.id, createdBy: { $in: req.journalOwnerIds } },
            changes,
            { returnDocument: 'after' }
        );
        if (!idea) return res.status(404).json({ message: 'Idea not found' });
        return res.status(200).json({ idea });
    } catch (error) {
        console.error('Update idea error:', error);
        return res.status(500).json({ message: 'Error updating idea' });
    }
}

async function deleteIdea(req, res) {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ message: 'Idea not found' });
        }
        const idea = await ideaModel.findOneAndDelete({
            _id: req.params.id,
            createdBy: { $in: req.journalOwnerIds },
        });
        if (!idea) return res.status(404).json({ message: 'Idea not found' });
        return res.status(200).json({ message: 'Idea removed' });
    } catch (error) {
        console.error('Delete idea error:', error);
        return res.status(500).json({ message: 'Error removing idea' });
    }
}

module.exports = { listIdeas, createIdeas, updateIdea, deleteIdea };

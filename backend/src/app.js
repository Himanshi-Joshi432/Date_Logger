const express = require('express');
const cors = require('cors');
const multer = require('multer');
const authRoute = require('./routes/auth.route');
const postRoute = require('./routes/post.route');
const coupleRoute = require('./routes/couple.route');
const ideaRoute = require('./routes/idea.route');

const app = express();

// The backend is only reachable through nginx, so trust one proxy hop.
// This makes req.ip the real client address (used by the auth rate limiter).
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Browser origins allowed to call the API. Native mobile requests send no Origin and are unaffected.
const DEFAULT_ORIGINS = [
    'https://date-logger.singlehq.me',
    'http://localhost:5173',
];
const allowedOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
const originAllowList = new Set(allowedOrigins.length ? allowedOrigins : DEFAULT_ORIGINS);

app.use(cors({
    origin(origin, cb) {
        cb(null, !origin || originAllowList.has(origin));
    }
}));

app.use(express.json({ limit: '1mb' }));

app.get('/intro', (req, res) => {
    res.json({ message: "Success" });
});

app.use('/api/auth', authRoute);
app.use('/api/post', postRoute);
app.use('/api/couple', coupleRoute);
app.use('/api/ideas', ideaRoute);

app.use('/api', (req, res) => {
    res.status(404).json({ message: 'Not found' });
});

// Central error handler: upload limits, bad JSON, rejected file types.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        const messages = {
            LIMIT_FILE_SIZE: 'Each file must be 15 MB or smaller',
            LIMIT_FILE_COUNT: 'Too many files in one upload',
            LIMIT_UNEXPECTED_FILE: 'Too many files for one field',
        };
        const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        return res.status(status).json({ message: messages[err.code] || err.message });
    }
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ message: 'Malformed JSON body' });
    }
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ message: 'Request body too large' });
    }
    if (err.status && err.status < 500) {
        return res.status(err.status).json({ message: err.message });
    }
    console.error('Unhandled error:', err);
    return res.status(500).json({ message: 'Internal server error' });
});

module.exports = app;

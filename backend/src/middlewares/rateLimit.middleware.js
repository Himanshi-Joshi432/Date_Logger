/**
 * Minimal in-memory fixed-window rate limiter keyed by client IP.
 * Good enough for a single backend container; use a shared store if you scale out.
 */
function rateLimit({ windowMs, max, message }) {
    const hits = new Map();

    const sweep = setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of hits) {
            if (entry.resetAt <= now) hits.delete(key);
        }
    }, windowMs);
    sweep.unref();

    return function rateLimitMiddleware(req, res, next) {
        const key = req.ip;
        const now = Date.now();
        let entry = hits.get(key);

        if (!entry || entry.resetAt <= now) {
            entry = { count: 0, resetAt: now + windowMs };
            hits.set(key, entry);
        }

        entry.count += 1;

        if (entry.count > max) {
            res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
            return res.status(429).json({ message });
        }

        next();
    };
}

module.exports = rateLimit;

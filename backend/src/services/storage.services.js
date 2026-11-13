const ImageKit = require('@imagekit/nodejs');
const { toFile } = require('@imagekit/nodejs');
const multer = require('multer');
const dotenv = require('dotenv');

dotenv.config();

const imageKit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY
});

const IMAGE_FIELDS = new Set(['images', 'image']);
const AUDIO_FIELDS = new Set(['audio', 'music']);
const AUDIO_EXT_RE = /\.(mp3|wav|m4a|aac|ogg)$/i;

function fileFilter(req, file, cb) {
    const mime = file.mimetype || '';
    if (IMAGE_FIELDS.has(file.fieldname)) {
        if (mime.startsWith('image/')) return cb(null, true);
        return cb(badFileError(`"${file.originalname}" is not an image`));
    }
    if (AUDIO_FIELDS.has(file.fieldname)) {
        if (mime.startsWith('audio/') || AUDIO_EXT_RE.test(file.originalname || '')) return cb(null, true);
        return cb(badFileError(`"${file.originalname}" is not an audio file`));
    }
    return cb(badFileError(`Unexpected upload field "${file.fieldname}"`));
}

function badFileError(message) {
    const err = new Error(message);
    err.status = 400;
    return err;
}

// Memory storage for multipart uploads (images & audio).
// Keep these limits in step with client_max_body_size in frontend/nginx.conf.
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: {
        fileSize: 15 * 1024 * 1024, // per file
        files: 16                   // 15 photos + 1 soundtrack
    }
});

/**
 * Uploads a multer file object, Buffer, or base64 string to ImageKit.
 * @returns {Promise<{url: string, fileId: string}>}
 */
async function uploadImage(fileData, customFileName) {
    if (!fileData) {
        throw new Error('No file provided for upload');
    }

    let filePayload;
    let fileName = customFileName;

    if (Buffer.isBuffer(fileData)) {
        fileName = (fileName || `file_${Date.now()}.jpg`).replace(/[^a-zA-Z0-9.-]/g, '_');
        filePayload = await toFile(fileData, fileName);
    } else if (fileData && fileData.buffer) {
        const defaultExt = fileData.mimetype?.startsWith('audio/') ? 'mp3' : 'jpg';
        fileName = (fileName || fileData.originalname || `file_${Date.now()}.${defaultExt}`).replace(/[^a-zA-Z0-9.-]/g, '_');
        filePayload = await toFile(
            fileData.buffer,
            fileName,
            fileData.mimetype ? { type: fileData.mimetype } : undefined
        );
    } else if (typeof fileData === 'string') {
        fileName = (fileName || `file_${Date.now()}.jpg`).replace(/[^a-zA-Z0-9.-]/g, '_');
        filePayload = fileData;
    } else {
        throw new Error('Unsupported file format provided to uploadImage');
    }

    return imageKit.files.upload({
        file: filePayload,
        fileName: fileName
    });
}

/**
 * Best-effort removal of uploaded files. Failures are logged, never thrown,
 * so a storage hiccup can't block deleting the post itself.
 */
async function deleteFiles(fileIds = []) {
    const ids = fileIds.filter(Boolean);
    const results = await Promise.allSettled(ids.map((id) => imageKit.files.delete(id)));
    results.forEach((r, i) => {
        if (r.status === 'rejected') {
            console.warn(`Failed to delete ImageKit file ${ids[i]}:`, r.reason?.message || r.reason);
        }
    });
}

/**
 * Best-effort removal of files known only by their public URL. Used for posts created
 * before file ids were recorded. Each file is looked up by name and only deleted when
 * its URL matches exactly, so an unrelated file with the same name is never touched.
 */
async function deleteFilesByUrl(urls = []) {
    for (const url of urls) {
        try {
            if (typeof url !== 'string' || !url.includes('imagekit.io')) continue;
            const name = decodeURIComponent(new URL(url).pathname.split('/').pop() || '');
            if (!name || name.includes('"')) continue;
            const matches = await imageKit.assets.list({ searchQuery: `name = "${name}"`, limit: 20 });
            const target = url.split('?')[0];
            const file = (matches || []).find((f) => f.fileId && typeof f.url === 'string' && f.url.split('?')[0] === target);
            if (file) await imageKit.files.delete(file.fileId);
        } catch (error) {
            console.warn(`Failed to delete stored file ${url}:`, error?.message || error);
        }
    }
}

/** Removes everything a post stored: by recorded file ids, or by URL for older posts. */
async function deletePostFiles(post) {
    const ids = post.fileIds || [];
    if (ids.length > 0) return deleteFiles(ids);
    const urls = [...(post.images || []), post.image, post.music?.audioUrl].filter(Boolean);
    return deleteFilesByUrl([...new Set(urls)]);
}

module.exports = uploadImage;
module.exports.uploadImage = uploadImage;
module.exports.uploadFile = uploadImage;
module.exports.deleteFiles = deleteFiles;
module.exports.deleteFilesByUrl = deleteFilesByUrl;
module.exports.deletePostFiles = deletePostFiles;
module.exports.upload = upload;
module.exports.imageKit = imageKit;

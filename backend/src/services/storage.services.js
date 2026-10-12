const ImageKit = require('@imagekit/nodejs');
const { toFile } = require('@imagekit/nodejs');
const multer = require('multer');
const dotenv = require('dotenv');

dotenv.config();

const imageKit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY
});

// Configure multer memory storage for handling multipart form uploads (images & audio)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 25 * 1024 * 1024 // 25MB file limit (supports both images and audio files)
    }
});

/**
 * Uploads an image or audio file to ImageKit.
 * Supports:
 * - Multer file object (req.file / req.files)
 * - Raw Buffer
 * - Base64 string / URL
 *
 * @param {Buffer|Object|string} fileData - The file buffer, multer file object, or base64 string
 * @param {string} [customFileName] - Optional file name
 * @returns {Promise<Object>} ImageKit upload response containing url, fileId, etc.
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
        // Multer file object
        const defaultExt = fileData.mimetype?.startsWith('audio/') ? 'mp3' : 'jpg';
        fileName = (fileName || fileData.originalname || `file_${Date.now()}.${defaultExt}`).replace(/[^a-zA-Z0-9.-]/g, '_');
        filePayload = await toFile(
            fileData.buffer,
            fileName,
            fileData.mimetype ? { type: fileData.mimetype } : undefined
        );
    } else if (typeof fileData === 'string') {
        // Base64 string or remote URL
        fileName = (fileName || `file_${Date.now()}.jpg`).replace(/[^a-zA-Z0-9.-]/g, '_');
        filePayload = fileData;
    } else {
        throw new Error('Unsupported file format provided to uploadImage');
    }

    const result = await imageKit.files.upload({
        file: filePayload,
        fileName: fileName
    });

    return result;
}

module.exports = uploadImage;
module.exports.uploadImage = uploadImage;
module.exports.uploadFile = uploadImage;
module.exports.upload = upload;
module.exports.imageKit = imageKit;


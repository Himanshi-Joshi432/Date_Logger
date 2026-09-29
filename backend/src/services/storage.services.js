const ImageKit = require('@imagekit/nodejs');
const { toFile } = require('@imagekit/nodejs');
const multer = require('multer');
const dotenv = require('dotenv');

dotenv.config();

const imageKit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY
});

// Configure multer memory storage for handling multipart form uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB file limit
    }
});

/**
 * Uploads an image to ImageKit.
 * Supports:
 * - Multer file object (req.file)
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
        fileName = (fileName || `image_${Date.now()}.jpg`).replace(/[^a-zA-Z0-9.-]/g, '_');
        filePayload = await toFile(fileData, fileName);
    } else if (fileData && fileData.buffer) {
        // Multer file object (req.file)
        fileName = (fileName || fileData.originalname || `image_${Date.now()}.jpg`).replace(/[^a-zA-Z0-9.-]/g, '_');
        filePayload = await toFile(
            fileData.buffer,
            fileName,
            fileData.mimetype ? { type: fileData.mimetype } : undefined
        );
    } else if (typeof fileData === 'string') {
        // Base64 string or remote URL
        fileName = (fileName || `image_${Date.now()}.jpg`).replace(/[^a-zA-Z0-9.-]/g, '_');
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
module.exports.upload = upload;
module.exports.imageKit = imageKit;

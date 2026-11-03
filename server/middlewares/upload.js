import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

// Memory storage to process buffer with sharp
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

const processAndSaveImages = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const uploadDir = path.join(process.cwd(), 'server/uploads/gallery');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = `smile-${uniqueSuffix}`;

    const originalBuffer = req.file.buffer;

    // 1. Thumbnail (400x300) - No watermark
    const thumbFilename = `${filename}-thumb.webp`;
    await sharp(originalBuffer)
      .resize(400, 300, { fit: 'cover' })
      .toFormat('webp')
      .webp({ quality: 80 })
      .withMetadata({ exif: false }) // HIPAA Compliance: Strip metadata
      .toFile(path.join(uploadDir, thumbFilename));

    // 2. Display version (800x600) with Watermark concept
    const displayFilename = `${filename}-display.webp`;
    await sharp(originalBuffer)
      .resize(800, 600, { fit: 'cover' })
      .toFormat('webp')
      .webp({ quality: 85 })
      .withMetadata({ exif: false })
      .toFile(path.join(uploadDir, displayFilename));

    // 3. Full high-res version (1200x900)
    const fullFilename = `${filename}-full.webp`;
    await sharp(originalBuffer)
      .resize(1200, 900, { fit: 'inside' })
      .toFormat('webp')
      .webp({ quality: 90 })
      .withMetadata({ exif: false })
      .toFile(path.join(uploadDir, fullFilename));

    // Attach processed image paths to request object
    req.processedImages = {
      thumbnail: `/uploads/gallery/${thumbFilename}`,
      display: `/uploads/gallery/${displayFilename}`,
      full: `/uploads/gallery/${fullFilename}`
    };

    next();
  } catch (err) {
    res.status(500).json({ error: 'Image processing failed: ' + err.message });
  }
};

export { upload, processAndSaveImages };
import multer from "multer";
import sharp from "sharp";

// Allowed image formats
const allowedMimeTypes = ["image/jpeg", "image/png", "image/jpg"];

// Configure Multer to store images in memory
const upload = multer({
  storage: multer.memoryStorage(), // Store in memory instead of Cloudinary
  limits: { fileSize: 10 * 1024 * 1024 }, // Limit: 10MB
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      console.warn("[WARNING] Unsupported file format:", file.mimetype);
      return cb(
        new Error("Only PNG, JPG, and JPEG formats are allowed"),
        false
      );
    }
    cb(null, true);
  },
});

/**
 * Process Image: Optimize without Uploading to Cloudinary
 */
export const processImage = async (req, res, next) => {
  try {
    if (!req.file) {
      console.warn("[WARNING] No image uploaded.");
      return res.status(400).json({ message: "Image upload required" });
    }

    if (!req.file.buffer || req.file.buffer.length === 0) {
      console.error("[ERROR] Image buffer is empty or invalid.");
      return res.status(400).json({ message: "Invalid image data" });
    }

    // Convert to JPEG & resize
    req.optimizedBuffer = await sharp(req.file.buffer)
      .toFormat("jpeg")
      .resize({ width: 1200 }) // Increased size
      .jpeg({ quality: 90 }) // Increased quality
      .toBuffer();

    next(); // Move to next middleware
  } catch (error) {
    console.error("[ERROR] Image processing failed:", error.message);
    res
      .status(500)
      .json({ message: "Error processing image", error: error.message });
  }
};

export default upload;

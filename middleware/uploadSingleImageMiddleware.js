import multer from "multer";
import path from "path";
import fs from "fs";

// Set storage directory dynamically
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.resolve("tmp");

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}${path.extname(file.originalname)}`);
  },
});

// File filter for **Images**
const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeType = allowedTypes.test(file.mimetype);

  if (extName && mimeType) {
    cb(null, true);
  } else {
    cb(new Error("Only images (jpeg, jpg, png, gif) are allowed!"));
  }
};

// Multer instance for **Single Image Upload**
export const singleImageUpload = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

export const uploadArtworkFiles = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max for PPTX, 5MB for images
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      /jpeg|jpg|png|gif/.test(file.mimetype)
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only images (jpeg, jpg, png, gif) and .pptx files are allowed!"));
    }
  },
}).fields([
  { name: "images", maxCount: 10 }, // Handle multiple images
  { name: "pptx", maxCount: 1 }, // Handle single PPTX file
]);

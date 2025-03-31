import Artwork from "../models/Artwork.js";
import cloudinary from "../config/cloudinary.js";
import { logAction } from "./auditLogController.js";
import { checkAIImage } from "../utils/sightengineCheck.js";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { rm } from 'fs/promises';
import archiver from "archiver";
import ZIP from "archiver-zip-encrypted";

// ✅ Register ZIP encryption ONCE (at module load)
if (!archiver._formatRegistered?.has("zip-encrypted")) {
  archiver.registerFormat("zip-encrypted", ZIP);
}

const writeFileAsync = promisify(fs.writeFile);

export const uploadArtwork = async (req, res) => {
  const tmpDir = path.join(process.cwd(), 'tmp')

  try {
    const { title, description, category } = req.body;

    // 🔹 Validate required fields
    if (!title || !description || !category) {
      return res.status(400).json({
        status: "error",
        message: "Title, description, and category are required",
      });
    }

    const imageFiles = req.files?.images || [];
    const pptxFiles = req.files?.pptx || [];
    if (!imageFiles.length)
      return res.status(400).json({ error: "No images uploaded" });

    let uploadedImages = [];
    let pptxData = null;


    // ✅ Handle Image Uploads
    for (let file of imageFiles) {
      let filePath = file.path;

      // 🔹 If file.path is missing, create a temp file
      if (!filePath) {
        const tempFilePath = path.join(
          "/tmp",
          `${Date.now()}-${file.originalname}`
        );
        await writeFileAsync(tempFilePath, file.buffer);
        filePath = tempFilePath;
      }

      const tempUpload = await cloudinary.uploader.upload(filePath, {
        folder: "temp_uploads",
      });

      const imageUrl = tempUpload.secure_url;

      // 🛡️ AI Image Detection
      const isAI = await checkAIImage(imageUrl);
      if (isAI.rejected) {
        await cloudinary.uploader.destroy(tempUpload.public_id);
        return res.status(400).json({
          status: "error",
          message: "AI-generated image detected",
          error: {
            type: "AI_DETECTION",
            reasons: isAI.reasons,
          },
        });
      }

      const finalUpload = await cloudinary.uploader.upload(imageUrl, {
        folder: "artworks",
        transformation: [
          {
            overlay: "My Brand:artbid_luoaal",
            width: 80,
            gravity: "south_east",
            opacity: 50,
            effect: "brightness:20",
            x: 10,
            y: 10,
          },
        ],
      });

      uploadedImages.push({
        public_id: finalUpload.public_id,
        url: finalUpload.secure_url,
      });

      // 🗑️ Cleanup: Delete temp files & Cloudinary temp upload
      await cloudinary.uploader.destroy(tempUpload.public_id);
    }

    // ✅ Handle PPTX Upload (if exists)
    if (pptxFiles.length > 0) {
      const pptxFile = pptxFiles[0];
      const originalPath = pptxFile.path;
      const zipPath = path.join("tmp", `${Date.now()}.zip`);
      const zipOutput = fs.createWriteStream(zipPath);
      const pin = Math.floor(1000 + Math.random() * 9000).toString();

      // 🔹 Create encrypted ZIP (format already registered)
      const archive = archiver.create("zip-encrypted", {
        zlib: { level: 9 },
        encryptionMethod: "aes256",
        password: pin,
      });

      archive.pipe(zipOutput);
      archive.append(fs.createReadStream(originalPath), {
        name: pptxFile.originalname,
      });
      archive.finalize();

      await new Promise((resolve, reject) => {
        zipOutput.on("close", resolve);
        archive.on("error", reject);
      });

      // Upload to Cloudinary
      const zipUpload = await cloudinary.uploader.upload(zipPath, {
        folder: "artworks/pptx",
        resource_type: "raw",
      });

      pptxData = {
        public_id: zipUpload.public_id,
        url: zipUpload.secure_url,
        pin,
      };
    }

    // ✅ Save Artwork in DB
    const artwork = await Artwork.create({
      title,
      description,
      category,
      imageUrl: uploadedImages,
      pptxFile: pptxData, // Store PPTX file info with PIN
      owner: req.user._id,
    });

    res.status(201).json({
      status: "success",
      message: "Artwork uploaded successfully",
      artwork,
    });
  } catch (error) {
    console.error("❌ Upload Error:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  } finally {
    // 🧹 100% Guaranteed Cleanup (even if error occurs)
    try {
      await rm(tmpDir, { recursive: true, force: true }); // Node.js 14+
      // OR for older Node.js:
      // await rmdir(tmpDir, { recursive: true });
    } catch (cleanupError) {
      console.error("⚠ Failed to delete tmp folder (non-critical):", cleanupError);
    }
  }
};

/**
 * Get all artworks
 */
export const getAllArtworks = async (req, res) => {
  try {
    const artworks = await Artwork.find().populate("category", "name");

    res.status(200).json({
      status: "success",
      message: "Successfully fetched artworks",
      artworks,
    });
  } catch (error) {
    console.error("[ERROR] Fetching artworks:", error.message);
    res.status(500).json({
      status: "error",
      message: "Error fetching artworks",
      error: error.message,
    });
  }
};

/**
 * Get single artwork by ID
 */
export const getArtwork = async (req, res) => {
  try {
    const { id } = req.params;
    const artwork = await Artwork.findById(id).populate("category", "name");

    if (!artwork) {
      return res.status(404).json({
        status: "error",
        message: "Artwork not found",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Successfully fetched artwork",
      artwork,
    });
  } catch (error) {
    console.error("[ERROR] Fetching artwork:", error.message);
    res.status(500).json({
      status: "error",
      message: "Error fetching artwork",
      error: error.message,
    });
  }
};

/**
 * Get artworks of the logged-in user
 */
export const getUserArtworks = async (req, res) => {
  try {
    const userId = req.user._id;
    const artworks = await Artwork.find({ userId }).populate(
      "category",
      "name"
    );

    res.status(200).json({
      status: "success",
      message: "Successfully fetched your artworks",
      artworks,
    });
  } catch (error) {
    console.error("[ERROR] Fetching user artworks:", error.message);
    res.status(500).json({
      status: "error",
      message: "Error fetching user artworks",
      error: error.message,
    });
  }
};

/**
 * Delete an artwork (Only owner can delete)
 */
export const deleteArtwork = async (req, res) => {
  try {
    const { id } = req.params;
    const artwork = await Artwork.findById(id);

    if (!artwork) {
      return res.status(404).json({
        status: "error",
        message: "Artwork not found",
      });
    }

    await artwork.deleteOne();

    // Log deletion action
    await logAction(
      req.user,
      "Artwork Deleted",
      `Deleted Artwork ID: ${id}`,
      req.ip
    );

    res.status(200).json({
      status: "success",
      message: "Artwork deleted successfully",
    });
  } catch (error) {
    console.error("[ERROR] Deleting artwork:", error.message);
    res.status(500).json({
      status: "error",
      message: "Error deleting artwork",
      error: error.message,
    });
  }
};

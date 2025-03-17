import Artwork from "../models/Artwork.js";
import cloudinary from "../config/cloudinary.js";
import { logAction } from "./auditLogController.js";
import { checkAIImage } from "../utils/sightengineCheck.js";
import fs from "fs";
import path from "path";
import { promisify } from "util";

const writeFileAsync = promisify(fs.writeFile);
const unlinkFileAsync = promisify(fs.unlink);

/**
 * Upload an artwork
 */
export const uploadArtwork = async (req, res) => {
  try {
    const { title, description, category } = req.body;

    // 🔹 Validate required fields
    if (!title || !description || !category) {
      return res.status(400).json({
        status: "error",
        message: "Title, description, and category are required",
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No images uploaded" });
    }

    let uploadedImages = [];

    for (let file of req.files) {
      let filePath = file.path;

      // 🔹 If file.path is missing, create a temp file
      if (!filePath) {
        const tempFilePath = path.join("/tmp", `${Date.now()}-${file.originalname}`);
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
        await unlinkFileAsync(filePath);
        return res.status(400).json({
          error: "Image rejected due to the following reasons:",
          reasons: isAI.reasons,
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
      await unlinkFileAsync(filePath);
      await cloudinary.uploader.destroy(tempUpload.public_id);
    }

    // ✅ Save artwork in DB
    const artwork = await Artwork.create({
      title,
      description,
      category,
      imageUrl: uploadedImages,
      owner: req.user._id,
    });

    res.status(201).json({
      status: "success",
      message: "Artwork uploaded successfully",
      artwork,
    });
  } catch (error) {
    console.error("❌ Upload Error:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};
/**
 * Get all artworks
 */
export const getAllArtworks = async (req, res) => {
  try {
    const artworks = await Artwork.find().populate(
      "category",
      "name"
    );

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
    const artwork = await Artwork.findById(id).populate(
      "category",
      "name"
    );

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

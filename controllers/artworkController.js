import Artwork from "../models/Artwork.js";
import cloudinary from "../config/cloudinary.js";
import { logAction } from "./auditLogController.js";
import { checkAIImage } from "../utils/sightengineCheck.js";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { rm } from "fs/promises";
import archiver from "archiver";
import ZIP from "archiver-zip-encrypted";

// ✅ Register ZIP encryption ONCE (at module load)
if (!archiver._formatRegistered?.has("zip-encrypted")) {
  archiver.registerFormat("zip-encrypted", ZIP);
}

const writeFileAsync = promisify(fs.writeFile);

export const uploadArtwork = async (req, res) => {
  const tmpDir = path.join(process.cwd(), "tmp");

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
        folder: "Artworks/pptx",
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
      console.error(
        "⚠ Failed to delete tmp folder (non-critical):",
        cleanupError
      );
    }
  }
};

export const getAllArtworks = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const query = search ? { title: { $regex: search, $options: "i" } } : {};

    const artworks = await Artwork.find(query)
      .populate("category", "name")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Artwork.countDocuments(query);

    res.status(200).json({
      status: "success",
      message: "Successfully fetched Artworks",
      artworks,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[ERROR] Fetching Artworks:", error.message);
    res.status(500).json({
      status: "error",
      message: "Error fetching Artworks",
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

export const updateArtwork = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category } = req.body;

    // Handle image uploads
    let imageUpdates = [];
    if (req.files?.images) {
      const imageUploads = req.files.images.map(file =>
        cloudinary.uploader.upload(file.path)
      );
      imageUpdates = await Promise.all(imageUploads);
    }

    // Handle PPTX upload
    let pptxUpdate = null;
    if (req.files?.pptx) {
      pptxUpdate = await cloudinary.uploader.upload(req.files.pptx[0].path, {
        resource_type: "raw"
      });
    }

    // Build update object
    const updateData = {
      title,
      description,
      category,
      ...(imageUpdates.length > 0 && {
        imageUrl: imageUpdates.map(img => ({
          url: img.secure_url,
          publicId: img.public_id
        }))
      }),
      ...(pptxUpdate && {
        pptx: {
          url: pptxUpdate.secure_url,
          publicId: pptxUpdate.public_id
        }
      })
    };

    const updatedArtwork = await Artwork.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate("category", "name");

    if (!updatedArtwork) {
      return res.status(404).json({
        status: "error",
        message: "Artwork not found",
      });
    }

    await logAction(
      req.user,
      "Artwork Updated",
      `Updated Artwork ID: ${id}`,
      req.ip
    );

    res.status(200).json({
      status: "success",
      message: "Artwork updated successfully",
      artwork: updatedArtwork,
    });
  } catch (error) {
    console.error("[ERROR] Updating artwork:", error.message);
    res.status(500).json({
      status: "error",
      message: "Error updating artwork",
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

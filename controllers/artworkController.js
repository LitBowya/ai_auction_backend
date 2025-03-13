import Artwork from "../models/Artwork.js";
import cloudinary from "../config/cloudinary.js";
import { logAction } from "./auditLogController.js";
import upload, { processImage } from "../middleware/imageUploadMiddleware.js";
import { detectFraudulentImage } from "../utils/imageSecurity.js";
import { applyWatermark } from "../utils/imageWatermark.js";

/**
 * Upload an artwork
 */
export const uploadArtwork = async (req, res) => {
  console.log("[DEBUG] Uploading artwork...");

  upload.single("image")(req, res, async (err) => {
    if (err) {
      console.error("[ERROR] File upload error:", err.message);
      return res.status(400).json({ message: err.message });
    }

    console.log(
      "[DEBUG] Image uploaded:",
      req.file ? req.file.originalname : "No file"
    );

    await processImage(req, res, async () => {
      try {
        console.log("[DEBUG] Checking for watermarks...");

        // 🔹 Step 1: Check if the image is AI-generated or fraudulent
        const { isFraud, label, confidence } = await detectFraudulentImage(
          req.optimizedBuffer
        );
        console.log(
          `[DEBUG] Image Classification: ${label} (Confidence: ${confidence})`
        );

        if (isFraud) {
          console.error(
            "[SECURITY] Fraudulent or AI-generated image detected!"
          );
          return res.status(403).json({
            message: `Upload rejected. Image classified as ${label} with confidence ${confidence}.`,
          });
        }

        console.log("[DEBUG] No fraud detected. Applying watermarks");

        // 🔹 Step 3: Apply custom watermark
        const watermarkedBuffer = await applyWatermark(req.optimizedBuffer);
        console.log("[SUCCESS] Watermark applied. Uploading to Cloudinary...");

        // 🔹 Step 4: Upload to Cloudinary
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "artworks", format: "jpeg" },
          (error, result) => {
            if (error) {
              console.error("[ERROR] Cloudinary upload failed:", error);
              return res
                .status(500)
                .json({ message: "Image upload error", error });
            }

            console.log(
              "[SUCCESS] Image uploaded to Cloudinary:",
              result.secure_url
            );

            // 🔹 Step 5: Save to MongoDB **after Cloudinary upload**
            Artwork.create({
              title: req.body.title,
              description: req.body.description,
              category: req.body.category,
              imageUrl: result.secure_url,
              owner: req.user._id,
            })
              .then((artwork) => {
                console.log("[SUCCESS] Artwork created:", artwork._id);
                res.status(201).json({
                  message: "Artwork uploaded successfully",
                  artwork,
                });
              })
              .catch((dbError) => {
                console.error("[ERROR] Database error:", dbError.message);
                res
                  .status(500)
                  .json({ message: "Database error", error: dbError.message });
              });
          }
        );

        uploadStream.end(watermarkedBuffer);
      } catch (error) {
        console.error("[ERROR] Error uploading artwork:", error.message);
        return res.status(500).json({
          message: "Error uploading artwork",
          error: error.message,
        });
      }
    });
  });
};

/**
 * Get all artworks
 */
export const getAllArtworks = async (req, res) => {
  try {
    const artworks = await Artwork.find().populate("owner category", "name email name");
    console.log("Fetched all artworks"); // Debug log
    res.json({artworks});
  } catch (error) {
    console.error("Error fetching artworks:", error.message); // Debug log
    res
      .status(500)
      .json({ message: "Error fetching artworks", error: error.message });
  }
};

export const getArtwork = async (req, res) => {
  try {
    const artworks = await Artwork.findById(req.params.id).populate("owner category", "name email name");
    console.log("Fetched artwork"); // Debug log
    res.json({artworks});
  } catch (error) {
    console.error("Error fetching artworks:", error.message); // Debug log
    res
    .status(500)
    .json({ message: "Error fetching artworks", error: error.message });
  }
};

/**
 * Delete an artwork (Only owner can delete)
 */
export const deleteArtwork = async (req, res) => {
  try {
    const artwork = await Artwork.findById(req.params.id);

    if (!artwork) {
      console.error("Artwork not found:", req.params.id); // Debug log
      return res.status(404).json({ message: "Artwork not found" });
    }

    await artwork.deleteOne();

    await logAction(
      req.user,
      "Artwork Deleted",
      `Deleted Artwork ID: ${req.params.id}`,
      req.ip
    );

    console.log("Artwork deleted successfully:", req.params.id); // Debug log
    res.json({ message: "Artwork deleted successfully" });
  } catch (error) {
    console.error("Error deleting artwork:", error.message); // Debug log
    res
      .status(500)
      .json({ message: "Error deleting artwork", error: error.message });
  }
};

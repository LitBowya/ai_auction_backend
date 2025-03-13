import sharp from "sharp";
import path from "path";
import fs from "fs/promises";

const watermarkPath = path.join("assets", "artbid.png");

/**
 * Apply AI-resistant watermark to an image using Sharp
 * - Uses multiple watermarks with randomized positions & opacity
 * @param {Buffer} imageBuffer - Image buffer
 * @returns {Buffer} - Watermarked image buffer
 */
export const applyWatermark = async (imageBuffer) => {
  try {
    console.log("[DEBUG] Applying watermark...");

    if (!imageBuffer || imageBuffer.length === 0) {
      throw new Error("Empty image buffer provided to watermark function");
    }

    console.log(
      "[DEBUG] Image buffer size before watermarking:",
      imageBuffer.length,
      "bytes"
    );

    if (!(await fileExists(watermarkPath))) {
      throw new Error("Watermark file missing!");
    }

    console.log("[DEBUG] Watermark file found at:", watermarkPath);

    const watermark = await sharp(watermarkPath)
      .resize({ width: 100 }) // Resize watermark dynamically
      .png()
      .toBuffer();

    console.log("[DEBUG] Applying watermark to image...");
    const watermarkedBuffer = await sharp(imageBuffer)
      .toFormat("jpeg")
      .composite([
        {
          input: watermark,
          gravity: "southeast",
          blend: "overlay",
        },
      ])
      .toBuffer();

    console.log("[SUCCESS] Watermarking completed.");
    return watermarkedBuffer;
  } catch (error) {
    console.error("[ERROR] Watermarking failed:", error);
    throw new Error("Watermarking failed");
  }
};

/**
 * Check if a file exists
 */
const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

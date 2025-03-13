import { pipeline } from "@xenova/transformers";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const unlinkAsync = promisify(fs.unlink);

/**
 * Clear all files from the temporary directory before execution
 */
const clearTempDirectory = () => {
  const tempDir = path.join(__dirname, "temp");
  if (fs.existsSync(tempDir)) {
    fs.readdirSync(tempDir).forEach((file) => {
      try {
        fs.unlinkSync(path.join(tempDir, file));
      } catch (error) {
        console.warn(`[WARNING] Failed to delete ${file}:`, error);
      }
    });
  }
};

clearTempDirectory();

let clipModel;

/**
 * Load OpenAI CLIP model for AI fraud detection
 */
const loadCLIPModel = async () => {
  try {
    clipModel = await pipeline(
      "zero-shot-image-classification",
      "Xenova/clip-vit-base-patch32"
    );
  } catch (error) {
    console.error("[ERROR] Failed to load OpenAI CLIP model:", error);
  }
};

// Load model at startup
loadCLIPModel();

/**
 * Convert image buffer to a JPEG and save temporarily
 * @param {Buffer} imageBuffer - Raw image buffer
 * @returns {Promise<string>} - Path to temporary image file
 */
const saveTempImage = async (imageBuffer) => {
  const tempDir = path.join(__dirname, "temp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const tempPath = path.join(tempDir, `temp_${Date.now()}.jpg`);
  await sharp(imageBuffer).jpeg().toFile(tempPath);
  return tempPath;
};

/**
 * Detect AI-generated or fraudulent images using OpenAI CLIP
 * @param {Buffer} imageBuffer - Image buffer
 * @returns {Promise<{ isFraud: boolean, label: string, confidence: number } | null>}
 */
export const detectFraudulentImage = async (imageBuffer) => {
  let imagePath;
  try {
    if (!clipModel) {
      console.warn("[WARNING] CLIP model not loaded. Skipping AI check.");
      return null;
    }

    // ✅ Save image temporarily
    imagePath = await saveTempImage(imageBuffer);

    // ✅ Run CLIP model on the image path
    const results = await clipModel(imagePath, [
      "AI-generated",
      "Human-created",
      "Fraudulent",
    ]);

    // ✅ Extract classification results
    const { label, score } = results[0];

    // ✅ Flag as fraud if confidence is high
    if ((label === "AI-generated" || label === "Fraudulent") && score > 0.6) {
      console.warn(
        "[SECURITY ALERT] AI-generated or fraudulent image detected!"
      );
      return { isFraud: true, label, confidence: score };
    }

    return { isFraud: false, label, confidence: score };
  } catch (error) {
    console.error("[ERROR] Fraud detection failed:", error);
    return null;
  } finally {
    // ✅ Ensure the temporary file is deleted safely
    if (imagePath && fs.existsSync(imagePath)) {
      try {
        await unlinkAsync(imagePath);
      } catch (unlinkError) {
        console.warn("[WARNING] Failed to delete temporary file:", unlinkError);
      }
    }
  }
};

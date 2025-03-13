import { pipeline } from "@xenova/transformers";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const unlinkAsync = promisify(fs.unlink);

// ✅ Set cache directory to a writable path
const cacheDir = "/tmp/xenova_cache";
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}
process.env.XENOVA_CACHE_DIR = cacheDir;

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
    console.log("[SUCCESS] Temporary directory cleared.");
  }
};

clearTempDirectory();

let clipModel;

/**
 * Load OpenAI CLIP model for AI fraud detection
 */
const loadCLIPModel = async () => {
  try {
    console.log("[DEBUG] Loading OpenAI CLIP model...");
    clipModel = await pipeline(
      "zero-shot-image-classification",
      "Xenova/clip-vit-base-patch16"
    );
    console.log("[SUCCESS] OpenAI CLIP model loaded.");
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
/**
 * Detect AI-generated or fraudulent images
 */
export const detectFraudulentImage = async (imageBuffer) => {
  try {
    // ✅ Ensure model is loaded
    clipModel = await loadCLIPModel();
    if (!clipModel) return null;

    // ✅ Convert image to JPEG buffer
    const jpegBuffer = await sharp(imageBuffer).jpeg().toBuffer();

    // ✅ Run AI classification
    const results = await clipModel(jpegBuffer, [
      "AI-generated",
      "Human-created",
      "Fraudulent",
    ]);

    const { label, score } = results[0];

    // ✅ Flag as fraud if confidence is high
    if ((label === "AI-generated" || label === "Fraudulent") && score > 0.6) {
      console.warn("[SECURITY ALERT] Fraudulent image detected!");
      return { isFraud: true, label, confidence: score };
    }

    return { isFraud: false, label, confidence: score };
  } catch (error) {
    console.error("[ERROR] Fraud detection failed:", error);
    return null;
  }
};

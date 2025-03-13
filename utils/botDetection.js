import fs from "fs";
import path from "path";
import { promisify } from "util";
import { fileURLToPath } from "url";
import { pipeline } from "@xenova/transformers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const unlinkAsync = promisify(fs.unlink);

// ✅ Set cache directory globally before model loads
const cacheDir = "/tmp/xenova_cache";
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}
process.env.XDG_CACHE_HOME = cacheDir;
process.env.TRANSFORMERS_CACHE = cacheDir;
process.env.XENOVA_CACHE_DIR = cacheDir;

console.log(`[DEBUG] Using cache directory: ${cacheDir}`);

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
      "Xenova/clip-vit-small-patch16"
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
 */
const saveTempImage = async (imageBuffer) => {
  const tempDir = path.join(__dirname, "temp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const tempPath = path.join(tempDir, `temp_${Date.now()}.jpg`);
  await sharp(imageBuffer).jpeg().toFile(tempPath);
  return tempPath;
};
/**
 * Convert image buffer to a JPEG and save temporarily
 * @param {Buffer} imageBuffer - Raw image buffer
 * @returns {Promise<string>} - Path to temporary image file

/**
 * AI-based bot detection
 */
export const detectBot = async (userId, imageBuffer = null) => {
  try {
    // ✅ Ensure model is loaded
    clipModel = await loadCLIPModel();
    if (!clipModel) return false;

    // ✅ Check for flagged bot users
    const botUsers = ["bot123", "testBot"];
    if (botUsers.includes(userId)) {
      console.warn(`[SECURITY ALERT] Bot detected: ${userId}`);
      return true;
    }

    // ✅ Analyze image if provided
    if (imageBuffer) {
      const results = await clipModel(imageBuffer, [
        "AI-generated",
        "Human-created",
      ]);

      if (results[0].label === "AI-generated" && results[0].score > 0.8) {
        console.warn("[SECURITY ALERT] Bot detected from image analysis!");
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("[ERROR] Bot detection failed:", error);
    return false;
  }
};

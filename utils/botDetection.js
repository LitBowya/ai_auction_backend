import { pipeline } from "@xenova/transformers";

let clipModel;

/**
 * Load OpenAI CLIP for AI-based detection (Correct format)
 */
const loadCLIPModel = async () => {
  try {
    console.log("[DEBUG] Loading OpenAI CLIP model...");
    clipModel = await pipeline(
      "zero-shot-image-classification",
      "Xenova/clip-vit-base-patch32"
    );

    console.log("[SUCCESS] OpenAI CLIP model loaded.");
  } catch (error) {
    console.error("[ERROR] Failed to load OpenAI CLIP model:", error);
  }
};

// Load model at startup
loadCLIPModel();
/**
 * AI-based bot detection using OpenAI CLIP
 * @param {string} userId - ID of the user placing the bid
 * @param {Buffer} imageBuffer - User profile image or artwork (optional)
 * @returns {Promise<boolean>} - Returns true if bot detected
 */
export const detectBot = async (userId, imageBuffer = null) => {
  try {
    if (!clipModel) {
      console.warn("[WARNING] CLIP model not loaded. Skipping AI detection.");
      return false;
    }

    console.log(`[DEBUG] Running AI-based bot detection for User ${userId}...`);

    // Example list of suspicious user behavior
    const botUsers = ["bot123", "testBot"]; // Example flagged bot users
    if (botUsers.includes(userId)) {
      console.warn(`[SECURITY ALERT] Bot detected: ${userId}`);
      return true;
    }

    // If an image is provided, run CLIP image classification
    if (imageBuffer) {
      console.log("[DEBUG] Running OpenAI CLIP image analysis...");
      const results = await clipModel(imageBuffer, [
        "AI-generated",
        "Human-created",
      ]);
      console.log("[DEBUG] CLIP Model Results:", results);

      // If AI-generated confidence is high, flag as a bot
      if (results[0].label === "AI-generated" && results[0].score > 0.8) {
        console.warn("[SECURITY ALERT] Bot detected from image analysis!");
        return true;
      }
    }

    console.log(`[SUCCESS] User ${userId} passed bot detection.`);
    return false;
  } catch (error) {
    console.error("[ERROR] Bot detection failed:", error);
    return false; // Default to false if detection fails
  }
};

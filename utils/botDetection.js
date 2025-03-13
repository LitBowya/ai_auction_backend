import { pipeline } from "@xenova/transformers";
import sharp from "sharp"; // For processing images in-memory

let clipModel;

/**
 * Load OpenAI CLIP model for AI fraud detection
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

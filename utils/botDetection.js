import { loadCLIPModel } from "../utils/clipModel.js";

let clipModel;

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

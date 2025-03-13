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

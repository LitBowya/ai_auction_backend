import { pipeline } from "@xenova/transformers";
import sharp from "sharp";

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
 * Detect AI-generated or fraudulent images using OpenAI CLIP
 * @param {Buffer} imageBuffer - Image buffer
 * @returns {Promise<{ isFraud: boolean, label: string, confidence: number } | null>}
 */
export const detectFraudulentImage = async (imageBuffer) => {
  try {
    if (!clipModel) {
      console.warn("[WARNING] CLIP model not loaded. Skipping AI check.");
      return null;
    }

    // ✅ Convert image to JPEG Buffer (no temp file needed)
    const jpegBuffer = await sharp(imageBuffer).jpeg().toBuffer();

    // ✅ Run CLIP model on buffer instead of file
    const results = await clipModel(jpegBuffer, [
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
  }
};

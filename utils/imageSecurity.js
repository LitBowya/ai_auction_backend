import { pipeline } from "@xenova/transformers";
import fs from "fs";
import path from "path";

let clipModel;

/**
 * Load OpenAI CLIP for AI-based fraud detection
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

// Load the model at startup
loadCLIPModel();

/**
 * Detect AI-generated or fraudulent images using OpenAI CLIP
 * @param {Buffer} imageBuffer - Image buffer
 * @returns {Promise<{ isFraud: boolean, label: string, confidence: number }>}
 */
export const detectFraudulentImage = async (imageBuffer) => {
  try {
    if (!clipModel) {
      console.warn("[WARNING] CLIP model not loaded. Skipping image security check.");
      return { isFraud: false, label: "Unknown", confidence: 0 };
    }

    console.log("[DEBUG] Running AI fraud detection on image...");

    // 🔹 Step 1: Save the buffer as a temporary image file (CLIP expects a file path)
    const tempImagePath = path.join("/tmp", `temp_image_${Date.now()}.jpg`);
    fs.writeFileSync(tempImagePath, imageBuffer);

    // 🔹 Step 2: Run CLIP model using the file path
    const results = await clipModel(tempImagePath, [
      "AI-generated",
      "Human-created",
      "Fraudulent",
    ]);
    console.log("[DEBUG] CLIP Model Results:", results);

    // 🔹 Step 3: Remove the temporary file after processing
    fs.unlinkSync(tempImagePath);

    // 🔹 Step 4: Extract classification data
    const { label, score } = results[0]; // Highest confidence label

    console.log(`[DEBUG] Image classified as ${label} with confidence ${score}`);

    // 🔹 Step 5: Flag the image if AI-generated or fraudulent
    if ((label === "AI-generated" || label === "Fraudulent") && score > 0.6) {
      console.warn("[SECURITY ALERT] AI-generated or fraudulent image detected!");
      return { isFraud: true, label, confidence: score };
    }

    console.log("[SUCCESS] Image passed fraud check.");
    return { isFraud: false, label, confidence: score };
  } catch (error) {
    console.error("[ERROR] Fraud detection failed using OpenAI CLIP:", error);
    return { isFraud: false, label: "Error", confidence: 0 };
  }
};

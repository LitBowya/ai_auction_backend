import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { AutoProcessor, CLIPVisionModelWithProjection, RawImage } from "@xenova/transformers";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tempDir = path.join(__dirname, "temp");

// Ensure temp directory exists
await fs.mkdir(tempDir, { recursive: true });

console.log("[DEBUG] Using local CLIP model for fraud detection.");

const processor = await AutoProcessor.from_pretrained("Xenova/clip-vit-base-patch16");
const vision_model = await CLIPVisionModelWithProjection.from_pretrained("Xenova/clip-vit-base-patch16");

/**
 * Save image buffer as a temporary file
 * @param {Buffer} imageBuffer - Raw image buffer
 * @returns {Promise<string>} - Path to saved image file
 */
const saveTempImage = async (imageBuffer) => {
  const tempPath = path.join(tempDir, `temp_${Date.now()}.jpg`);
  await sharp(imageBuffer).jpeg().toFile(tempPath);
  return tempPath;
};

/**
 * Delete all temporary files
 */
const clearTempDirectory = async () => {
  try {
    const files = await fs.readdir(tempDir);
    for (const file of files) {
      await fs.unlink(path.join(tempDir, file));
    }
    console.log("[SUCCESS] Temporary directory cleared.");
  } catch (error) {
    console.warn("[WARNING] Failed to clear temp directory:", error);
  }
};

/**
 * Detect AI-generated or fraudulent images using local CLIP model
 * @param {Buffer} imageBuffer - Image buffer
 * @returns {Promise<{ isFraud: boolean, label: string, confidence: number, message: string }>}
 */
export const detectFraudulentImage = async (imageBuffer) => {
  try {
    console.log("[DEBUG] Running AI fraud detection locally...");

    const tempImagePath = await saveTempImage(imageBuffer);
    const image = await RawImage.decode(imageBuffer);
    const image_inputs = await processor(image);
    const { image_embeds } = await vision_model(image_inputs);

    console.log("[DEBUG] Image embeddings computed.");

    // Placeholder similarity check
    const computeSimilarity = (vectorA, vectorB) => {
  const dotProduct = vectorA.reduce((sum, val, i) => sum + val * vectorB[i], 0);
  const normA = Math.sqrt(vectorA.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(vectorB.reduce((sum, val) => sum + val * val, 0));
  return normA === 0 || normB === 0 ? 0 : dotProduct / (normA * normB);
};

// Example similarity computation
// Load known AI-generated embeddings from file (if exists)
const embeddingsFilePath = path.join(__dirname, "known_ai_embeddings.json");
let knownAIEmbeddings = [];
if (await fs.access(embeddingsFilePath).then(() => true).catch(() => false)) {
  const data = await fs.readFile(embeddingsFilePath, "utf-8");
  knownAIEmbeddings = JSON.parse(data);
  console.log("[DEBUG] Loaded AI-generated embeddings from file.");
} else {
  console.log("[DEBUG] No pre-existing AI-generated embeddings found. Starting fresh.");
}

// Compare against all known AI-generated embeddings
let maxSimilarity = 0;
for (const knownEmbedding of knownAIEmbeddings) {
  const similarity = computeSimilarity(image_embeds.data, knownEmbedding);
  maxSimilarity = Math.max(maxSimilarity, similarity);
}
const confidence = maxSimilarity;
    const isAI = confidence > 0.6;
    const label = isAI ? "AI-generated" : "Human-created";

    console.log(`[DEBUG] Image classified as ${label} with confidence ${confidence}`);

    await clearTempDirectory(); // Clean up temp files

    return { isFraud: isAI, label, confidence, message: `This image is classified as ${label} with ${confidence.toFixed(2)} confidence.` };
  } catch (error) {
    console.error("[ERROR] Fraud detection failed:", error);
    return { isFraud: false, label: "Error", confidence: 0, message: "An error occurred during fraud detection." };
  }
};

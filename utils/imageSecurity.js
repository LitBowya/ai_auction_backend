import fs from "fs";
import path from "path";
import { promisify } from "util";
import { fileURLToPath } from "url";
import { AutoProcessor, CLIPVisionModelWithProjection, RawImage } from "@xenova/transformers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const unlinkAsync = promisify(fs.unlink);

console.log("[DEBUG] Using local CLIP model for fraud detection.");

// Load processor and vision model
const processor = await AutoProcessor.from_pretrained("Xenova/clip-vit-base-patch16");
const vision_model = await CLIPVisionModelWithProjection.from_pretrained("Xenova/clip-vit-base-patch16");

// Path to store known AI-generated embeddings
const embeddingsFilePath = path.join(__dirname, "known_ai_embeddings.json");

// Load known AI-generated embeddings from file (if exists)
let knownAIEmbeddings = [];
if (fs.existsSync(embeddingsFilePath)) {
  knownAIEmbeddings = JSON.parse(fs.readFileSync(embeddingsFilePath, "utf-8"));
  console.log("[DEBUG] Loaded AI-generated embeddings from file.");
} else {
  console.log("[DEBUG] No pre-existing AI-generated embeddings found. Starting fresh.");
}

/**
 * Save known AI-generated embeddings to file
 */
const saveEmbeddings = () => {
  fs.writeFileSync(embeddingsFilePath, JSON.stringify(knownAIEmbeddings, null, 2));
  console.log("[SUCCESS] AI-generated embeddings saved.");
};

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

/**
 * Convert image buffer to a format suitable for processing
 * @param {Buffer} imageBuffer - Raw image buffer
 * @returns {Promise<RawImage>} - Processed image object
 */
const processImageBuffer = async (imageBuffer) => {
  return await RawImage.fromBuffer(imageBuffer);
};

/**
 * Compute cosine similarity between two vectors
 */
const computeSimilarity = (vectorA, vectorB) => {
  const dotProduct = vectorA.reduce((sum, val, i) => sum + val * vectorB[i], 0);
  const normA = Math.sqrt(vectorA.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(vectorB.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (normA * normB);
};

/**
 * Store AI-generated image embeddings for future comparison
 * @param {Float32Array} embedding - Computed embedding for an AI-generated image
 */
export const storeAIEmbedding = (embedding) => {
  knownAIEmbeddings.push(Array.from(embedding));
  saveEmbeddings();
};

/**
 * Detect AI-generated or fraudulent images using local CLIP model
 * @param {Buffer} imageBuffer - Image buffer
 * @returns {Promise<{ isFraud: boolean, label: string, confidence: number }>}
 */
export const detectFraudulentImage = async (imageBuffer) => {
  try {
    console.log("[DEBUG] Running AI fraud detection locally...");

    const image = await processImageBuffer(imageBuffer);
    const image_inputs = await processor(image);
    const { image_embeds } = await vision_model(image_inputs);

    console.log("[DEBUG] Image embeddings computed.");

    let maxSimilarity = 0;
    for (const knownEmbedding of knownAIEmbeddings) {
      const similarity = computeSimilarity(image_embeds.data, knownEmbedding);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }

    console.log(`[DEBUG] Maximum similarity to AI-generated images: ${maxSimilarity}`);

    const isAI = maxSimilarity > 0.6;
    const label = isAI ? "AI-generated" : "Human-created";
    const confidence = maxSimilarity;

    console.log(`[DEBUG] Image classified as ${label} with confidence ${confidence}`);

    if (isAI) {
      storeAIEmbedding(image_embeds.data);
      console.warn("[SECURITY ALERT] AI-generated or fraudulent image detected!");
      return { isFraud: true, label, confidence };
    }

    console.log("[SUCCESS] Image passed fraud check.");
    return { isFraud: false, label, confidence };
  } catch (error) {
    console.error("[ERROR] Fraud detection failed:", error);
    return { isFraud: false, label: "Error", confidence: 0 };
  }
};

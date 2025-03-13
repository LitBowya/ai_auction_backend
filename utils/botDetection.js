import fs from "fs";
import path from "path";
import { promisify } from "util";
import { fileURLToPath } from "url";
import { AutoProcessor, CLIPTextModelWithProjection, AutoTokenizer } from "@xenova/transformers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const unlinkAsync = promisify(fs.unlink);

console.log("[DEBUG] Using local CLIP model for bot detection.");

// Load tokenizer and text model
const tokenizer = await AutoTokenizer.from_pretrained("Xenova/clip-vit-base-patch16");
const text_model = await CLIPTextModelWithProjection.from_pretrained("Xenova/clip-vit-base-patch16");

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
 * Detect AI-based bot activity using CLIP text embeddings
 * @param {string} userId - User identifier
 * @param {string} bidAmount - The message submitted with the bid (if any)
 * @returns {Promise<boolean>} - True if bot detected, false otherwise
 */
export const detectBot = async (userId, bidAmount = "") => {
  try {
    const botUsers = ["bot123", "testBot", "autobidder"];
    if (botUsers.includes(userId)) {
      console.warn(`[SECURITY ALERT] Bot detected: ${userId}`);
      return true;
    }

    if (bidAmount) {
      console.log("[DEBUG] Analyzing bid message for bot detection...");
      const text_inputs = tokenizer([bidAmount], { padding: true, truncation: true });
      const { text_embeds } = await text_model(text_inputs);

      // Placeholder: Define known bot-like bid message embeddings
      const knownBotEmbeddings = [
        new Float32Array(512).fill(0.2), // Replace with real bot message embeddings
      ];

      let maxSimilarity = 0;
      for (const knownEmbedding of knownBotEmbeddings) {
        const similarity = text_embeds.data.reduce((sum, val, i) => sum + val * knownEmbedding[i], 0);
        maxSimilarity = Math.max(maxSimilarity, similarity);
      }

      console.log(`[DEBUG] Maximum similarity to bot-like messages: ${maxSimilarity}`);
      if (maxSimilarity > 0.7) {
        console.warn("[SECURITY ALERT] Bot detected from bid message analysis!");
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("[ERROR] Bot detection failed:", error);
    return false;
  }
};

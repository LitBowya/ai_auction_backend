import { env, pipeline } from "@xenova/transformers";

// ✅ Set cache directory to the downloaded model location
env.cacheDir = "../model";

let clipModel;

/**
 * Load OpenAI CLIP model from local storage
 */
const loadCLIPModel = async () => {
  try {
    if (!clipModel) {
      console.log("[INFO] Loading CLIP model from cache...");
      clipModel = await pipeline(
        "zero-shot-image-classification",
        "Xenova/clip-vit-base-patch32"
      );
      console.log("[SUCCESS] CLIP model loaded successfully.");
    }
    return clipModel;
  } catch (error) {
    console.error("[ERROR] Failed to load OpenAI CLIP model:", error);
    return null;
  }
};

// ✅ Export the function for reuse
export { loadCLIPModel };

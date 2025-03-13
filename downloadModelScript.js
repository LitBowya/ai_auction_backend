import { env, pipeline } from "@xenova/transformers";

async function downloadModel() {
  env.cacheDir = "./model"; // Change cache directory to a writable location
  await pipeline("zero-shot-image-classification", "Xenova/clip-vit-base-patch32");
  console.log("Model downloaded successfully.");
}

downloadModel();

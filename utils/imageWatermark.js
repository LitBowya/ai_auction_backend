import sharp from "sharp";
import path from "path";


export const applyWatermark = async (filePath) => {
  try {
    // Define the path to the watermark image
    const watermarkPath = path.join(__dirname, "../assets/artbid.png");

    // Load the main image and the watermark
    const image = sharp(filePath);
    const watermark = sharp(watermarkPath);

    // Resize the watermark to 100x100 pixels
    const resizedWatermark = await watermark.resize(100, 100).toBuffer();

    // Get the dimensions of the main image
    const metadata = await image.metadata();
    const { width, height } = metadata;

    // Composite the watermark onto the main image
    const watermarkedImage = await image
      .composite([
        {
          input: resizedWatermark,
          top: height - 110, // Position watermark 10px from the bottom
          left: width - 110, // Position watermark 10px from the right
        },
      ])
      .toBuffer();

    // Save the watermarked image back to the file path
    await sharp(watermarkedImage).toFile(filePath);

    return { success: true, filePath };
  } catch (error) {
    console.error("Watermark Error:", error);
    return { success: false, message: "Failed to apply watermark." };
  }
};
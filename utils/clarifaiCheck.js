import pkg from "clarifai-nodejs"; // Import the entire package
const { Input, Model } = pkg; // Destructure the required components
import dotenv from "dotenv";

dotenv.config();

const model = new Model({
  authConfig: {
    pat: process.env.CLARIFAI_PERSONAL_ACCESS_TOKEN,
    userId: process.env.CLARIFAI_USER_ID,
    appId: process.env.CLARIFAI_APP_ID
  },
  modelId: "general-image-recognition",
});

export const reverseImageSearch = async (imageUrl) => {
  try {
    const input = Input.getInputFromUrl({ inputId: "temp-image", imageUrl });

    const response = await model.predict({ inputs: [input] });

    const concepts = response?.[0]?.data?.conceptsList ?? [];
    const foundOnline = concepts.some(concept => concept.value > 0.9);

    console.log('Response', response?.[0]?.data)

    if (foundOnline) {
      console.log("Image found online. Rejecting.");
      return { success: false, message: "Image already exists online." };
    }

    return { success: true };
  } catch (error) {
    console.error("Clarifai Error:", error);
    return { success: false, message: "Clarifai error occurred." };
  }
};

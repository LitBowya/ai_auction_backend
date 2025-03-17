import axios from "axios";

export const checkAIImage = async (imageUrl) => {
  try {
    console.log("Checking image for AI-generated content, nudity, and text/watermark:", imageUrl);

    const response = await axios.get("https://api.sightengine.com/1.0/check.json", {
      params: {
        url: imageUrl,
        models: "genai",
        api_user: process.env.SIGHTENGINE_API_USER,
        api_secret: process.env.SIGHTENGINE_API_SECRET,
      },
    });

    const rejectionReasons = [];

    // Check if image is AI-generated
    if (response.data?.type?.ai_generated > 0.6) {
      rejectionReasons.push(`AI-generated (probability: ${response.data.type.ai_generated})`);
    }

    // If there are rejection reasons, return them
    if (rejectionReasons.length > 0) {
      return {
        rejected: true,
        reasons: rejectionReasons,
      };
    }

    // If all checks pass
    return { rejected: false };
  } catch (error) {
    console.error("Sightengine AI Check Error:", error.message || error.response?.data);
    return {
      rejected: true,
      reasons: ["Error occurred while checking image content. Please try again."],
    };
  }
};
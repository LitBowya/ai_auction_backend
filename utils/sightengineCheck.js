import axios from "axios";

export const checkAIImage = async (imageUrl) => {
  try {
    console.log("Checking image for AI-generated content, nudity, and text/watermark:", imageUrl);

    const response = await axios.get("https://api.sightengine.com/1.0/check.json", {
      params: {
        url: imageUrl,
        models: "nudity-2.1,genai",
        api_user: process.env.SIGHTENGINE_API_USER,
        api_secret: process.env.SIGHTENGINE_API_SECRET,
      },
    });

    console.log("Sightengine API Response:", response.data);

    const rejectionReasons = [];

    // Check if image is AI-generated
    if (response.data?.type?.ai_generated > 0.6) {
      rejectionReasons.push(`AI-generated (probability: ${response.data.type.ai_generated})`);
    }

    // Check for nudity
    const nudityScore = Math.max(
      response.data?.nudity?.sexual_activity || 0,
      response.data?.nudity?.sexual_display || 0,
      response.data?.nudity?.erotica || 0,
      response.data?.nudity?.very_suggestive || 0,
      response.data?.nudity?.suggestive || 0,
      response.data?.nudity?.mildly_suggestive || 0
    );

    if (nudityScore > 0.6) {
      rejectionReasons.push(`Nudity (probability: ${nudityScore})`);
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
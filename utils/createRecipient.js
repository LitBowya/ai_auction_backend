import axios from "axios";

export async function createRecipient(payload) {
  try {
    const response = await axios.post(
      "https://api.paystack.co/transferrecipient",
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    // You can enhance error handling as needed
    throw new Error(
      error.response?.data?.message || error.message || "Unknown error"
    );
  }
}

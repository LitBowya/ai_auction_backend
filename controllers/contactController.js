import { transporter } from "../utils/email.js"; // Assuming this is your Nodemailer setup

export const sendMessageController = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required." });
    }

    // Send email to (admin) or support team
    await transporter.sendMail({
      from: email, // User's email as sender
      to: process.env.GMAIL_USER, // Admin or Support email
      subject: `New Contact Message from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
    });

    res
      .status(200)
      .json({ success: true, message: "Message sent successfully!" });
  } catch (error) {
    console.error("[ERROR] Failed to send message:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to send message. Please try again.",
    });
  }
};

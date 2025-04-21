import { transporter } from "../utils/email.js"; // Assuming this is your Nodemailer setup

export const sendMessageController = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required." });
    }

    // HTML email template with styling
    const htmlEmail = `
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; }
          .container { max-width: 600px; margin: 20px auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; }
          .content { background-color: #ffffff; padding: 30px; border-radius: 5px; margin-top: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .field { margin-bottom: 15px; }
          .label { color: #6c757d; font-weight: 500; }
          .value { color: #212529; margin-top: 5px; display: block; }
          .message-content { background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="color: #2d3436; margin: 0;">New Contact Message</h2>
            <p style="color: #636e72; margin: 5px 0 0;">From your website contact form</p>
          </div>
          
          <div class="content">
            <div class="field">
              <span class="label">From:</span>
              <span class="value">${name} &lt;${email}&gt;</span>
            </div>
            
            <div class="field">
              <span class="label">Message:</span>
              <div class="message-content">
                ${message.replace(/\n/g, "<br>")}
              </div>
            </div>
          </div>
          
          <div style="margin-top: 30px; color: #6c757d; font-size: 0.9em;">
            <p>This message was sent from your website's contact form.</p>
            <p style="margin: 5px 0;">&copy; ${new Date().getFullYear()} Your Company Name</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email
    await transporter.sendMail({
      from: `"${name}" <${email}>`,
      to: process.env.GMAIL_USER,
      subject: `New Contact Message from ${name}`,
      html: htmlEmail,
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

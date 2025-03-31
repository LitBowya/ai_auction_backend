import dotenv from "dotenv";
import nodemailer from "nodemailer";
import User from "../models/User.js";

dotenv.config();

// Set up the email transporter
export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER, // your Gmail address
    pass: process.env.GMAIL_PASSWORD, // your Gmail password (or App password)
  },
});

export const verifyOTP = async (email, otp) => {
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return { success: false, message: "User not found." };
    }

    // Check if OTP has expired
    if (new Date() > user.otpExpiration) {
      return { success: false, message: "OTP has expired." };
    }

    // Check if OTP matches
    if (user.otp !== otp) {
      return { success: false, message: "Invalid OTP." };
    }

    // OTP is valid, clear OTP fields
    user.otp = undefined;
    user.otpExpiration = undefined;
    await user.save();

    return { success: true, message: "OTP verified successfully." };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "An error occurred while verifying OTP.",
    };
  }
};

// Function to send OTP email
export const sendOTP = async (email, otp, subject = "Your Verification Code", text = "") => {
  try {
    // Generate OTP expiration time (e.g., 10 minutes)
    const otpExpiration = new Date();
    otpExpiration.setMinutes(otpExpiration.getMinutes() + 10); // OTP valid for 10 minutes

    // Store the OTP and expiration time in the user's document
    const user = await User.findOneAndUpdate(
      { email },
      { otp, otpExpiration },
      { new: true }
    );

    // Beautified email content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h1 style="color: #2c3e50; text-align: center;">${subject}</h1>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center;">
          <p style="font-size: 16px; color: #34495e; margin-bottom: 10px;">Your verification code is:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2980b9; margin: 15px 0;">${otp}</div>
          <p style="font-size: 14px; color: #7f8c8d;">This code will expire in 10 minutes.</p>
        </div>
        <p style="font-size: 14px; color: #34495e; line-height: 1.6;">${text || 'Please use this code to verify your account. If you didn\'t request this, please ignore this email.'}</p>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center;">
          <p style="font-size: 12px; color: #95a5a6;">&copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
        </div>
      </div>
    `;

    // Send OTP email
    const mailOptions = {
      from: `"Your Company Name" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: subject,
      text: `Your verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\n${text || 'Please use this code to verify your account. If you didn\'t request this, please ignore this email.'}`,
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    return { success: true, message: "OTP sent successfully." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to send OTP. Please try again." };
  }
};

export const sendEmail = async (to, subject, text, html = "") => {
  try {
    // Default HTML template if none provided
    const defaultHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h1 style="color: #2c3e50;">${subject}</h1>
        <div style="padding: 20px 0; border-bottom: 1px solid #e0e0e0;">
          <p style="font-size: 16px; color: #34495e; line-height: 1.6;">${text.replace(/\n/g, '<br>')}</p>
        </div>
        <div style="margin-top: 20px; text-align: center;">
          <p style="font-size: 12px; color: #95a5a6;">&copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"Your Company Name" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      text,
      html: html || defaultHtml
    });
  } catch (error) {
    console.error("[ERROR] Email sending failed:", error.message);
  }
};

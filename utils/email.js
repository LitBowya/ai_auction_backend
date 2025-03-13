import dotenv from "dotenv";
import nodemailer from "nodemailer";
import User from "../models/User.js";

dotenv.config();

// Set up the email transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER, // your Gmail address
    pass: process.env.GMAIL_PASSWORD, // your Gmail password (or App password)
  },
});

// Function to send OTP email
export const sendOTP = async (email, otp) => {
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

    // Send OTP email
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: "Your OTP for Password Reset",
      text: `Your OTP for resetting your password is: ${otp}. It will expire in 10 minutes.`,
    };

    await transporter.sendMail(mailOptions);
    return { success: true, message: "OTP sent successfully." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to send OTP. Please try again." };
  }
};

// Function to verify the OTP
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

export const sendEmail = async (to, subject, text) => {
  try {
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to,
      subject,
      text,
    });

    console.log(`[EMAIL SENT] ${subject} to ${to}`);
  } catch (error) {
    console.error("[ERROR] Email sending failed:", error.message);
  }
};

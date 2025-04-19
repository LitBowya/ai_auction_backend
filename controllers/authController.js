import User from "../models/User.js"; // Adjust the import path as needed
import cloudinary from "../config/cloudinary.js";
import fs from "fs-extra";
import path from "path";
import { promisify } from "util";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendOTP } from "../utils/email.js";
import { verifyOTP } from "../utils/email.js";
import {singleImageUpload} from "../middleware/uploadSingleImageMiddleware.js";

const unlinkFileAsync = promisify(fs.unlink);

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export const registerUser = async (req, res) => {
  singleImageUpload.single("profileImage")(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });

    try {
      const { name, email, password, phone, address } = req.body;

      // Check if all required fields are provided
      if (!name || !email || !password || !phone || !address) {
        return res.status(400).json({ success: false, message: "All fields are required" });
      }

      // Check if the user already exists
      const userExists = await User.findOne({ email });
      if (userExists) {
        return res.status(400).json({ success: false, message: "User already exists" });
      }

      // Validate password strength
      const passwordErrors = validatePassword(password);
      if (passwordErrors.length > 0) {
        return res.status(400).json({ success: false, message: "Password is not strong enough", errors: passwordErrors });
      }

      // Upload profile image to Cloudinary
      const filePath = req.file.path;
      const cloudinaryResponse = await cloudinary.uploader.upload(filePath, { folder: "profile_pics" });
      await unlinkFileAsync(filePath);// Remove the file from the server after upload

      // Generate OTP and set expiration time
      const otp = generateOTP();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes

      // Create the user
      const user = await User.create({
        name,
        email,
        password,
        phone,
        address,
        profileImage: cloudinaryResponse.secure_url,
        otp,
        otpExpires,
      });

      // Send OTP to the user's email
      const emailResponse = await sendOTP(email, otp, 'You have successfully registered', `Your Otp verification code ${otp}`);
      if (!emailResponse.success) {
        return res.status(500).json({ success: false, message: emailResponse.message });
      }

      // Return success response
      res.status(201).json({ success: true, message: "OTP sent to email for verification" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "An error occurred during registration", error: error.message });
    }
  });
};

/**
 * 🔹 Validate Password Strength
 * @param {string} password - The password to validate
 * @returns {string[]} - Array of error messages (empty if password is valid)
 */
const validatePassword = (password) => {
  const errors = [];

  // Minimum length
  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  // At least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  // At least one lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  // At least one number
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  // At least one special character
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  return errors;
};

export const verifyUserOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP are required" });
    }

    const otpResponse = await verifyOTP(email, otp);
    if (!otpResponse.success) {
      return res.status(400).json({ success: false, message: otpResponse.message });
    }

    await User.findOneAndUpdate(
      { email },
      { verified: true, otp: null, otpExpires: null }
    );

    res.json({ success: true, message: "Email verified successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "An error occurred during OTP verification" });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    if (!user.verified) {
      return res.status(403).json({ success: false, message: "Please verify your email before logging in." });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "30d" });

    res.cookie("jwt", token, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // Change from 'strict' to 'lax' in dev
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/', // Ensure cookies are sent for all paths
    });

    res.status(200).json({ success: true, message: "Login successful", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "An error occurred during login" });
  }
};

export const requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const otp = generateOTP();
    user.resetOtp = otp;
    user.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    const emailResponse = await sendOTP(email, otp, subject='Password Reset Requested', 'Your Otp verification code');
    if (!emailResponse.success) {
      return res.status(500).json({ success: false, message: emailResponse.message });
    }

    res.json({ success: true, message: "OTP sent for password reset" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "An error occurred while requesting password reset" });
  }
};

export const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const otpResponse = await verifyOTP(email, otp);
    if (!otpResponse.success) {
      return res.status(400).json({ success: false, message: otpResponse.message });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findOneAndUpdate(
      { email },
      { password: hashedPassword, resetOtp: null, resetOtpExpires: null }
    );

    res.json({ success: true, message: "Password reset successful" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "An error occurred while resetting password" });
  }
};

export const logoutUser = async (req, res) => {
  try {
    res.cookie("jwt", "", { httpOnly: true, expires: new Date(0) });
    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ success: false, message: "Logout failed" });
  }
};
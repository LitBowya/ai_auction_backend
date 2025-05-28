import express from "express";
import {
  registerUser,
  verifyUserOTP,
  loginUser,
  requestPasswordReset,
  resetPassword,
  logoutUser,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/verify-otp", verifyUserOTP);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.post("/forgot-password", requestPasswordReset);
router.post("/reset-password", resetPassword);

export default router;

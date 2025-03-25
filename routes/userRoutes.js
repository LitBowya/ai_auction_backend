import express from "express";
import {
  getUserAuctions,
  getUserOrders,
  getUserPayments,
  getUserProfile,
  updateUserProfile,
  getAllUsers,
} from "../controllers/userController.js";

import { protect, isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Use userId as a URL parameter
router.get("/", protect, isAdmin, getAllUsers);
router.get("/:userId/profile", getUserProfile);
router.put("/:userId/profile", updateUserProfile);
router.get("/:userId/orders", getUserOrders);
router.get("/:userId/payments", getUserPayments);
router.get("/:userId/auctions", getUserAuctions);

export default router;

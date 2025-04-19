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
router.get("/", protect , getAllUsers);
router.get("/:userId/profile", protect, getUserProfile);
router.put("/:userId/profile", protect,  updateUserProfile);
router.get("/:userId/orders",  protect, getUserOrders);
router.get("/:userId/payments", protect,  getUserPayments);
router.get("/:userId/auctions",  protect, getUserAuctions);

export default router;

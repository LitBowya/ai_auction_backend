import express from "express";
import {
  getUserAuctions,
  getUserOrders,
  getUserPayments,
  getUserProfile,
  updateUserProfile,
} from "../controllers/userController.js";

const router = express.Router();

// Use userId as a URL parameter
router.get("/:userId/profile", getUserProfile);
router.put("/:userId/profile", updateUserProfile);
router.get("/:userId/orders", getUserOrders);
router.get("/:userId/payments", getUserPayments);
router.get("/:userId/auctions", getUserAuctions);

export default router;

import express from "express";
import { protect, isAdmin } from "../middleware/authMiddleware.js";
import {
  banUser,
  unbanUser,
  suspendAuction,
  unsuspendAuction,
  getAdminInsights,
} from "../controllers/adminController.js";

const router = express.Router();

router.get("/insights", protect, isAdmin, getAdminInsights);


router.put("/user/:userId/ban", protect, isAdmin, banUser);


router.put("/user/:userId/unban", protect, isAdmin, unbanUser);


router.put("/auction/:auctionId/suspend/:userId", protect, isAdmin, suspendAuction);

router.put("/auction/:auctionId/unsuspend/:userId", protect, isAdmin, unsuspendAuction);

export default router;

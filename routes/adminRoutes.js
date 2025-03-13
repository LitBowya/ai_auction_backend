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

/**
 * @swagger
 * /api/admin/insights:
 *   get:
 *     summary: Get admin insights
 *     description: Retrieve admin insights including total users, earnings, and active auctions.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved insights.
 *       401:
 *         description: Unauthorized, admin access required.
 */
router.get("/insights", protect, isAdmin, getAdminInsights);

/**
 * @swagger
 * /api/admin/user/{userId}/ban:
 *   put:
 *     summary: Ban a user
 *     description: Admin can ban a user for fraudulent activities or policy violations.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: The ID of the user to ban.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User banned successfully.
 *       403:
 *         description: Forbidden, admin access required.
 */
router.put("/user/:userId/ban", protect, isAdmin, banUser);

/**
 * @swagger
 * /api/admin/user/{userId}/unban:
 *   put:
 *     summary: Unban a user
 *     description: Admin can unban a previously banned user.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: The ID of the user to unban.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User unbanned successfully.
 *       403:
 *         description: Forbidden, admin access required.
 */
router.put("/user/:userId/unban", protect, isAdmin, unbanUser);

/**
 * @swagger
 * /api/admin/auction/{auctionId}/suspend:
 *   put:
 *     summary: Suspend an auction
 *     description: Admin can suspend an auction due to violations or fraud detection.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: auctionId
 *         required: true
 *         description: The ID of the auction to suspend.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Auction suspended successfully.
 *       403:
 *         description: Forbidden, admin access required.
 */
router.put("/auction/:auctionId/suspend", protect, isAdmin, suspendAuction);

/**
 * @swagger
 * /api/admin/auction/{auctionId}/unsuspend:
 *   put:
 *     summary: Unsuspend an auction
 *     description: Admin can restore a suspended auction.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: auctionId
 *         required: true
 *         description: The ID of the auction to unsuspend.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Auction unsuspended successfully.
 *       403:
 *         description: Forbidden, admin access required.
 */
router.put("/auction/:auctionId/unsuspend", protect, isAdmin, unsuspendAuction);

export default router;

import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getNotifications,
  markNotificationsAsRead,
} from "../controllers/notificationController.js";

const router = express.Router();

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get user notifications
 *     description: Retrieves all notifications for the authenticated user.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully.
 *       401:
 *         description: Unauthorized access.
 */
router.get("/", protect, getNotifications);

/**
 * @swagger
 * /api/notifications:
 *   put:
 *     summary: Mark notifications as read
 *     description: Marks all unread notifications as read for the authenticated user.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications marked as read successfully.
 *       401:
 *         description: Unauthorized access.
 */
router.put("/", protect, markNotificationsAsRead);

export default router;

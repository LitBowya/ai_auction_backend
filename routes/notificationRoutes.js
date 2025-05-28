import express from "express";
import { isAdmin, protect } from "../middleware/authMiddleware.js";
import {
  getNotifications,
  markNotificationsAsRead,
} from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", protect, isAdmin, getNotifications);

router.put("/", protect, isAdmin, markNotificationsAsRead);

export default router;

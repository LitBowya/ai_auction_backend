import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getNotifications,
  markNotificationsAsRead,
} from "../controllers/notificationController.js";

const router = express.Router();


router.get("/", protect, getNotifications);


router.put("/", protect, markNotificationsAsRead);

export default router;

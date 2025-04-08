import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getNotifications,
  markNotificationsAsRead,
} from "../controllers/notificationController.js";

const router = express.Router();


router.get("/", getNotifications);


router.put("/", markNotificationsAsRead);

export default router;

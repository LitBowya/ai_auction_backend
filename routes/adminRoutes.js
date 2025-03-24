import express from "express";
import { isAdmin, protect } from "../middleware/authMiddleware.js";
import {
  getAdminGraphInsights,
  getAdminInsights,
} from "../controllers/adminController.js";

const router = express.Router();

router.get("/", protect, isAdmin, getAdminInsights);
router.get("/insights", protect, isAdmin, getAdminGraphInsights);

export default router;

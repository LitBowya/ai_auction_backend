import express from "express";
import { isAdmin, protect } from "../middleware/authMiddleware.js";
import {
  getAdminGraphInsights,
  getAdminInsights,
} from "../controllers/adminController.js";

const router = express.Router();

router.get("/", isAdmin, protect,getAdminInsights);
router.get("/insights",isAdmin, protect, getAdminGraphInsights);

export default router;

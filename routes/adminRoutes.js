import express from "express";
import { isAdmin, protect } from "../middleware/authMiddleware.js";
import {
  getAdminGraphInsights,
  getAdminInsights,
} from "../controllers/adminController.js";

const router = express.Router();

router.get("/",getAdminInsights);
router.get("/insights", getAdminGraphInsights);

export default router;

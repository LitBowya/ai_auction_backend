import express from "express";
import { protect, isAdmin } from "../middleware/authMiddleware.js";
import {
  getAdminInsights,
} from "../controllers/adminController.js";

const router = express.Router();

router.get("/", protect, isAdmin, getAdminInsights);


export default router;

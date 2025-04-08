import express from "express";
import { protect, isAdmin } from "../middleware/authMiddleware.js";
import {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController.js";

const router = express.Router();

router.post("/", isAdmin, createCategory);
router.get("/", getCategories);
router.put("/:categoryId", isAdmin, updateCategory);
router.delete("/:categoryId", isAdmin, deleteCategory);

export default router;

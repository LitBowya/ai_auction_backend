import express from "express";
import { protect, isAdmin } from "../middleware/authMiddleware.js";
import {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController.js";

const router = express.Router();

router.post("/",protect, createCategory);
router.get("/", getCategories);
router.put("/:categoryId",protect, updateCategory);
router.delete("/:categoryId",protect, deleteCategory);

export default router;

import Category from "../models/Category.js";
import { logAction } from "./auditLogController.js";

/**
 * ✅ Create a new category (Admin only)
 */
export const createCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Category name is required" });
    }

    // Check if category exists
    const existingCategory = await Category.findOne({ name: name.trim() });
    if (existingCategory) {
      return res
        .status(409)
        .json({ success: false, message: "Category already exists" });
    }

    const category = await Category.create({ name: name.trim() });

    await logAction(
      req.user,
      "Category Created",
      `Created category: ${name}`,
      req.ip
    );

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    console.error("[ERROR] Creating category:", error);
    res.status(500).json({
      success: false,
      message: "Error creating category",
      error: error.message,
    });
  }
};

/**
 * ✅ Get all Categories
 */
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.status(200).json({ success: true, categories });
  } catch (error) {
    console.error("[ERROR] Fetching Categories:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching Categories",
      error: error.message,
    });
  }
};

/**
 * ✅ Update a category (Admin only)
 */
export const updateCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { name } = req.body;

    if (!name?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Category name is required" });
    }

    const category = await Category.findByIdAndUpdate(
      categoryId,
      { name: name.trim() },
      { new: true }
    );

    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    await logAction(
      req.user,
      "Category Updated",
      `Updated category: ${name}`,
      req.ip
    );

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    console.error("[ERROR] Updating category:", error);
    res.status(500).json({
      success: false,
      message: "Error updating category",
      error: error.message,
    });
  }
};

/**
 * ✅ Delete a category (Admin only)
 */
export const deleteCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const category = await Category.findByIdAndDelete(categoryId);

    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    await logAction(
      req.user,
      "Category Deleted",
      `Deleted category: ${category.name}`,
      req.ip
    );

    res
      .status(200)
      .json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    console.error("[ERROR] Deleting category:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting category",
      error: error.message,
    });
  }
};

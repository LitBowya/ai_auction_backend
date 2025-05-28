import express from "express";
import { getOrders, updateOrderStatus } from "../controllers/orderController.js";
import { protect, isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, isAdmin, getOrders);
router.put("/:id", protect, isAdmin, updateOrderStatus)

export default router;

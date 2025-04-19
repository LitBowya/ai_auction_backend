import express from "express";
import {
  confirmShipment,
  initiatePayment,
  verifyPayment,
  getAllPayment,
} from "../controllers/paymentController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getAllPayment);
router.post("/:auctionId/verify", protect, verifyPayment);
router.post("/:auctionId/pay", protect, initiatePayment);
router.put("/:paymentId/shipment", protect, confirmShipment);

export default router;

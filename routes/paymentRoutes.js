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
router.post("/:auctionId/verify", verifyPayment);
router.post("/:auctionId/pay", initiatePayment);
router.put("/:paymentId/shipment", confirmShipment);

export default router;

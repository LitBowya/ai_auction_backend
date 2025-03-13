import express from "express";
import {
  initiatePayment,
  confirmShipment,
  confirmReceipt,
  verifyPayment,
} from "../controllers/paymentController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();


router.post("/:auctionId/verify", protect, verifyPayment);


router.post("/:auctionId/initiate", protect, initiatePayment);

router.put("/:paymentId/shipment", protect, confirmShipment);

router.put("/:paymentId/receipt", protect, confirmReceipt);

export default router;

import express from "express";
import {
  initiatePayment,
  confirmShipment,
  confirmReceipt,
  verifyPayment,
} from "../controllers/paymentController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/payments/{auctionId}/verify:
 *   post:
 *     summary: Verify payment after Paystack callback
 *     description: Verifies the payment for a specific auction after Paystack processes it.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: auctionId
 *         required: true
 *         description: The ID of the auction.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment verified successfully.
 *       400:
 *         description: Invalid request.
 *       401:
 *         description: Unauthorized access.
 *       500:
 *         description: Server error.
 */
router.post("/:auctionId/verify", protect, verifyPayment);

/**
 * @swagger
 * /api/payments/{auctionId}/initiate:
 *   post:
 *     summary: Initiate payment for an auction
 *     description: Creates a payment request for the highest bidder after the auction ends.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: auctionId
 *         required: true
 *         description: The ID of the auction.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment link generated successfully.
 *       400:
 *         description: Invalid request.
 *       401:
 *         description: Unauthorized access.
 *       500:
 *         description: Server error.
 */
router.post("/:auctionId/initiate", protect, initiatePayment);

/**
 * @swagger
 * /api/payments/{paymentId}/shipment:
 *   put:
 *     summary: Confirm shipment by seller
 *     description: The seller confirms that the item has been shipped.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         description: The ID of the payment transaction.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Shipment confirmed successfully.
 *       400:
 *         description: Invalid request.
 *       401:
 *         description: Unauthorized access.
 *       500:
 *         description: Server error.
 */
router.put("/:paymentId/shipment", protect, confirmShipment);

/**
 * @swagger
 * /api/payments/{paymentId}/receipt:
 *   put:
 *     summary: Confirm receipt by buyer
 *     description: The buyer confirms that the item has been received, allowing funds to be released to the seller.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         description: The ID of the payment transaction.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Receipt confirmed successfully, funds released.
 *       400:
 *         description: Invalid request.
 *       401:
 *         description: Unauthorized access.
 *       500:
 *         description: Server error.
 */
router.put("/:paymentId/receipt", protect, confirmReceipt);

export default router;

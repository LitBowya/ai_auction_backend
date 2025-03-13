import express from "express";
import {
  setShippingDetails,
  getDefaultShipping,
} from "../controllers/shippingController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/shipping/{auctionId}:
 *   post:
 *     summary: Set shipping details for a specific auction
 *     description: Allows the highest bidder to provide shipping details for an auction they won.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: auctionId
 *         required: true
 *         description: The ID of the auction.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               address:
 *                 type: string
 *                 description: The shipping address.
 *               city:
 *                 type: string
 *                 description: The city for delivery.
 *               postalCode:
 *                 type: string
 *                 description: Postal code for delivery.
 *               country:
 *                 type: string
 *                 description: The country for shipping.
 *     responses:
 *       200:
 *         description: Shipping details saved successfully.
 *       400:
 *         description: Invalid request.
 *       401:
 *         description: Unauthorized access.
 *       500:
 *         description: Server error.
 */
router.post("/:auctionId", protect, setShippingDetails);

/**
 * @swagger
 * /api/shipping/default:
 *   get:
 *     summary: Get the user's default shipping details
 *     description: Retrieves the default shipping details of the authenticated user.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Default shipping details retrieved successfully.
 *       401:
 *         description: Unauthorized access.
 *       500:
 *         description: Server error.
 */
router.get("/default", protect, getDefaultShipping);

export default router;

import express from "express";
import {
  getAuctionBids,
  getAuctionHighestBid,
  getUserBids,
  placeBid,
} from "../controllers/bidController.js";
import { validateBid } from "../middleware/bidValidation.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();


router.get("/", protect, getUserBids);
router.get("/:auctionId", getAuctionBids);
router.get("/highest/:auctionId", getAuctionHighestBid);
router.post("/:auctionId", protect, validateBid, placeBid);

export default router;

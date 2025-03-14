import express from "express";
import {
  getAuctionBids,
  getAuctionHighestBid,
  getUserBids,
  placeBid,
} from "../controllers/bidController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();


router.get("/", protect, getUserBids);
router.get("/:auctionId", getAuctionBids);
router.get("/highest/:auctionId", getAuctionHighestBid);
router.post("/:auctionId", protect, placeBid);

export default router;

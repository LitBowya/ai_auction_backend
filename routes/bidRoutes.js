import express from "express";
import {
  getAllBids,
  getAuctionBids,
  getAuctionHighestBid,
  getUserBids,
  placeBid,
} from "../controllers/bidController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getAllBids);
router.get("/user", protect, getUserBids);
router.get("/:auctionId", getAuctionBids);
router.get("/highest/:auctionId", getAuctionHighestBid);
router.post("/:auctionId", protect, placeBid);

export default router;

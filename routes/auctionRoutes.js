import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createAuction,
  deleteAuction,
  endAuction,
  getActiveAuctions,
  getAllAuctions,
  getAuction,
  getAuctionInsights,
  getLatestAuction,
} from "../controllers/auctionController.js";

const router = express.Router();

router.get("/active", getActiveAuctions);
router.get("/all", getAllAuctions);
router.get("/latest", getLatestAuction);
router.get("/insights", protect, getAuctionInsights);
router.post("/", protect, createAuction);
router.get("/:id", getAuction);
router.put("/:id", protect, endAuction);
router.delete("/:id", protect, deleteAuction);

export default router;

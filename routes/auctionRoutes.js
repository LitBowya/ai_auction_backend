import express from "express";
import { isAdmin, protect } from "../middleware/authMiddleware.js";
import {
  createAuction,
  deleteAuction,
  endAuction,
  getActiveAuctions,
  getAllAuctions,
  getAuction,
  getAuctionInsights,
  getLatestAuction,
  getCompletedAuctions,
} from "../controllers/auctionController.js";

const router = express.Router();

router.get("/active", getActiveAuctions);
router.get("/", getAllAuctions);
router.get("/latest", getLatestAuction);
router.get("/completed", getCompletedAuctions);
router.get("/insights", protect, isAdmin, getAuctionInsights);
router.post("/", protect, isAdmin, createAuction);
router.get("/:id", getAuction);
router.put("/:id", protect, isAdmin, endAuction);
router.delete("/:id", protect, isAdmin, deleteAuction);

export default router;

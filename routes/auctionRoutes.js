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
} from "../controllers/auctionController.js";

const router = express.Router();

router.get("/active", getActiveAuctions);
router.get("/all", getAllAuctions);
router.get("/latest", getLatestAuction);
router.get("/insights", getAuctionInsights);
router.post("/", protect, isAdmin, createAuction);
router.get("/:id", getAuction);
router.put("/:id", protect, isAdmin, endAuction);
router.delete("/:id", protect, isAdmin, deleteAuction);

export default router;

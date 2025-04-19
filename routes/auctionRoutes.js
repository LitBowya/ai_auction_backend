import express from "express";
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
router.post("/", createAuction);
router.get("/:id", getAuction);
router.put("/:id", endAuction);
router.delete("/:id", deleteAuction);

export default router;

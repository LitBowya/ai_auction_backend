import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { isOwner } from "../middleware/ownershipMiddleware.js";
import {
  createAuction,
  getActiveAuctions,
  endAuction,
  getAllAuctions,
  deleteAuction,
  getAuction,
  getLatestAuction,
} from "../controllers/auctionController.js";

const router = express.Router();

router.get("/", getActiveAuctions);
router.get("/all", getAllAuctions);
router.get("/latest", getLatestAuction);
router.post("/", protect, createAuction);
router.get("/:id", protect, getAuction)
router.put("/:id", protect, endAuction);
router.delete("/:id", protect, deleteAuction);

export default router;

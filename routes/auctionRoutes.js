import express from "express";
import { protect, isAdmin } from "../middleware/authMiddleware.js";
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
router.post("/", protect, isAdmin, createAuction);
router.get("/:id", getAuction)
router.put("/:id", protect,isAdmin, endAuction);
router.delete("/:id", protect,isAdmin, deleteAuction);

export default router;

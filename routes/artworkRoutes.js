import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { isOwner } from "../middleware/ownershipMiddleware.js";
import {
  uploadArtwork,
  getAllArtworks,
  deleteArtwork,
  getArtwork
} from "../controllers/artworkController.js";

const router = express.Router();

router.get("/", getAllArtworks);
router.post("/", protect, uploadArtwork);
router.get("/:id", getArtwork)
router.delete("/:id", protect, isOwner, deleteArtwork);

export default router;

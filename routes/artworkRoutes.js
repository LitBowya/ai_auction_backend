import express from "express";
import { protect, isAdmin } from "../middleware/authMiddleware.js";
import {
  uploadArtwork,
  getAllArtworks,
  deleteArtwork,
  getArtwork
} from "../controllers/artworkController.js";
import { uploadMultiple } from "../middleware/uploadSingleImageMiddleware.js";

const router = express.Router();

router.get("/", getAllArtworks);
router.post("/", uploadMultiple, protect, isAdmin, uploadArtwork);
router.get("/:id", getArtwork)
router.delete("/:id", protect, isAdmin, deleteArtwork);

export default router;

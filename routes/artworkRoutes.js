import express from "express";
import { protect, isAdmin } from "../middleware/authMiddleware.js";
import {
  uploadArtwork,
  getAllArtworks,
  deleteArtwork,
  getArtwork
} from "../controllers/artworkController.js";
import { uploadArtworkFiles } from "../middleware/uploadSingleImageMiddleware.js";

const router = express.Router();

router.get("/", getAllArtworks);
router.post("/", protect, isAdmin, uploadArtworkFiles, uploadArtwork);
router.get("/:id", getArtwork)
router.delete("/:id", protect, isAdmin, deleteArtwork);

export default router;

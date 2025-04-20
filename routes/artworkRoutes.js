import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  deleteArtwork,
  getAllArtworks,
  getArtwork,
  uploadArtwork,
} from "../controllers/artworkController.js";
import { uploadArtworkFiles } from "../middleware/uploadSingleImageMiddleware.js";

const router = express.Router();

router.get("/", getAllArtworks);
router.post("/", protect, uploadArtworkFiles, uploadArtwork);
router.get("/:id", getArtwork);
router.delete("/:id", protect, deleteArtwork);

export default router;

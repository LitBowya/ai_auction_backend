import express from "express";
import { isAdmin, protect } from "../middleware/authMiddleware.js";
import {
  deleteArtwork,
  getAllArtworks,
  getArtwork,
  uploadArtwork,
  updateArtwork,
} from "../controllers/artworkController.js";
import { uploadArtworkFiles } from "../middleware/uploadSingleImageMiddleware.js";

const router = express.Router();

router.get("/", getAllArtworks);
router.post("/", protect, isAdmin, uploadArtworkFiles, uploadArtwork);
router.get("/:id", getArtwork);
router.put("/:id", protect, isAdmin, uploadArtworkFiles, updateArtwork);
router.delete("/:id", protect, isAdmin, deleteArtwork);

export default router;

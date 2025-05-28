import express from "express";
import {
  getAllUserShipping,
  getDefaultShipping,
  setShippingDetails,
} from "../controllers/shippingController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, setShippingDetails);
router.get("/", protect, getAllUserShipping);
router.get("/default", protect, getDefaultShipping);

export default router;

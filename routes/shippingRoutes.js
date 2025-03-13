import express from "express";
import {
  setShippingDetails,
  getDefaultShipping,
} from "../controllers/shippingController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();


router.post("/:auctionId", protect, setShippingDetails);

router.get("/default", protect, getDefaultShipping);

export default router;

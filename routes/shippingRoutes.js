import express from "express";
import {
  getDefaultShipping,
  setShippingDetails,
} from "../controllers/shippingController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, setShippingDetails);

router.get("/", getDefaultShipping);

export default router;

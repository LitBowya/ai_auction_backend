import express from "express";
import { sendMessageController } from "../controllers/contactController.js";

const router = express.Router();

// Route for sending contact messages
router.post("/send", sendMessageController);

export default router;

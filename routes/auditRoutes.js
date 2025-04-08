import express from "express";
import { protect, isAdmin } from "../middleware/authMiddleware.js";
import { getAuditLogs } from "../controllers/auditLogController.js";

const router = express.Router();


router.get("/", protect, isAdmin , getAuditLogs);

export default router;

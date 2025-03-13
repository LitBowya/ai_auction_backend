import express from "express";
import { protect, isAdmin } from "../middleware/authMiddleware.js";
import { getAuditLogs } from "../controllers/auditLogController.js";

const router = express.Router();

/**
 * @swagger
 * /api/audit-logs:
 *   get:
 *     summary: Retrieve audit logs
 *     description: Allows an admin to retrieve all audit logs for tracking actions on the platform.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved audit logs.
 *       401:
 *         description: Unauthorized, user must be logged in.
 *       403:
 *         description: Forbidden, only admins can access audit logs.
 */
router.get("/", protect, isAdmin, getAuditLogs);

export default router;

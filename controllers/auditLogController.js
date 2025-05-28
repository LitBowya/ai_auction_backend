import AuditLog from "../models/AuditLog.js";

/**
 * Log user actions for security monitoring
 */
export const logAction = async (user, action, details, ip) => {
  try {
    await AuditLog.create({
      user: user._id,
      action,
      details,
      ipAddress: ip || "Unknown IP",
    });
  } catch (error) {
    console.error("[Audit Log Error]:", error.message);
  }
};

/**
 * Get all audit logs (Admin only)
 */
export const getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find().populate("user", "name email");

    if (!logs.length) {
      return res.status(200).json({ message: "No audit logs found" });
    }

    res.status(200).json({
      success: true,
      message: "Audit logs retrieved successfully",
      data: logs,
    });
  } catch (error) {
    console.error("[ERROR] Failed to fetch audit logs:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching audit logs",
      error: error.message,
    });
  }
};

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
    console.error("Audit Log Error:", error.message);
  }
};

/**
 * Get all audit logs (Admin only)
 */
export const getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find().populate("user", "name email");
    res.json(logs);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching logs", error: error.message });
  }
};

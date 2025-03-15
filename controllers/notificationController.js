import Notification from "../models/Notification.js";

/**
 * ✅ Fetch all notifications for the logged-in user.
 */
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({ success: true, notifications });
  } catch (error) {
    console.error("[ERROR] Fetching notifications failed:", error);
    res.status(500).json({ success: false, message: "Error fetching notifications", error: error.message });
  }
};

/**
 * ✅ Mark notifications as read.
 */
export const markNotificationsAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { user: req.user._id, read: false },
      { $set: { read: true } }
    );

    res.status(200).json({ success: true, message: "Notifications marked as read", updatedCount: result.modifiedCount });
  } catch (error) {
    console.error("[ERROR] Marking notifications failed:", error);
    res.status(500).json({ success: false, message: "Error marking notifications", error: error.message });
  }
};
import Notification from "../models/Notification.js";

/**
 * Fetch all notifications for the logged-in user.
 */
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json(notifications);
  } catch (error) {
    console.error("[ERROR] Fetching notifications failed:", error.message);
    res.status(500).json({ message: "Error fetching notifications" });
  }
};

/**
 * Mark notifications as read.
 */
export const markNotificationsAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, read: false },
      { $set: { read: true } }
    );

    res.json({ message: "Notifications marked as read" });
  } catch (error) {
    console.error("[ERROR] Marking notifications failed:", error.message);
    res.status(500).json({ message: "Error marking notifications" });
  }
};

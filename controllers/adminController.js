import User from "../models/User.js";
import Auction from "../models/Auction.js";
import Payment from "../models/Payment.js";

export const getAdminInsights = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalBannedUsers = await User.countDocuments({ isBanned: true });
    const activeAuctions = await Auction.countDocuments({ status: "active" });
    const completedAuctions = await Auction.countDocuments({
      status: "completed",
    });
    const totalPayments = await Payment.countDocuments({ status: "confirmed" });

    // Calculate total earnings
    const payments = await Payment.find({ status: "confirmed" });
    const totalEarnings = payments.reduce(
      (acc, payment) => acc + payment.amount,
      0
    );

    res.status(200).json({
      totalUsers,
      totalBannedUsers,
      activeAuctions,
      completedAuctions,
      totalPayments,
      totalEarnings,
    });
  } catch (error) {
    console.error("[ERROR] Failed to fetch (admin) insights:", error.message);
    res.status(500).json({
      message: "Error fetching (admin) insights",
      error: error.message,
    });
  }
};

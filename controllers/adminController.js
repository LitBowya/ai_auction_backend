import User from "../models/User.js";
import Auction from "../models/Auction.js";
import Payment from "../models/Payment.js";

export const getAdminInsights = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeAuctions = await Auction.countDocuments({ status: "active" });
    const completedAuctions = await Auction.countDocuments({
      status: "completed",
    });
    const totalPayments = await Payment.countDocuments({ status: "paid" });

    // Calculate total earnings
    const payments = await Payment.find({ status: "paid" });
    const totalEarnings = payments.reduce(
      (acc, payment) => acc + payment.amount,
      0
    );

    res.status(200).json({
      totalUsers,
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

export const getAdminGraphInsights = async (req, res) => {
  try {
    // Fetch user growth over time (monthly)
    const userGrowth = await User.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fetch active Auctions over time (monthly)
    const activeAuctionsOverTime = await Auction.aggregate([
      {
        $match: { status: "active" },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fetch completed Auctions over time (monthly)
    const completedAuctionsOverTime = await Auction.aggregate([
      {
        $match: { status: "completed" },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fetch earnings over time (monthly)
    const earningsOverTime = await Payment.aggregate([
      {
        $match: { status: "paid" },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          totalEarnings: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Send the response
    res.status(200).json({
      userGrowth,
      activeAuctionsOverTime,
      completedAuctionsOverTime,
      earningsOverTime,
    });
  } catch (error) {
    console.error(
      "[ERROR] Failed to fetch (admin) graph insights:",
      error.message
    );
    res.status(500).json({
      message: "Error fetching (admin) graph insights",
      error: error.message,
    });
  }
};

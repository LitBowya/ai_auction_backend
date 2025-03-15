import User from "../models/User.js";
import Auction from "../models/Auction.js";
import AdminAction from "../models/AdminAction.js";
import { sendEmail } from "../utils/email.js";
import Payment from "../models/Payment.js";

/**
 * 🚫 Ban a user
 */
export const banUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isBanned = true;
    await user.save();

    // Log action
    await AdminAction.create({
      admin: req.user._id,
      actionType: "BAN_USER",
      targetUser: userId,
      reason,
    });

    // Notify user
    await sendEmail(
      user.email,
      "Account Banned",
      `Your account has been banned. Reason: ${reason}`
    );

    res.status(200).json({ message: "User banned successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error banning user", error: error.message });
  }
};

/**
 * ✅ Unban a user
 */
export const unbanUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isBanned = false;
    await user.save();

    // Log action
    await AdminAction.create({
      admin: req.user._id,
      actionType: "UNBAN_USER",
      targetUser: userId,
      reason: "Admin lifted the ban",
    });

     // Notify user
     await sendEmail(
      user.email,
      "Account Unbanned",
      `Your account has been unbanned. Reason: ${reason}`
    );

    res.status(200).json({ message: "User unbanned successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error unbanning user", error: error.message });
  }
};

/**
 * ⛔ Suspend an auction
 */
export const suspendAuction = async (req, res) => {
  try {
    const { auctionId, userId } = req.params;
    const { reason } = req.body;

    const auction = await Auction.findById(auctionId);
    if (!auction) return res.status(404).json({ message: "Auction not found" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    auction.isSuspended = true;
    await auction.save();

    // Log action
    await AdminAction.create({
      admin: req.user._id,
      actionType: "SUSPEND_AUCTION",
      targetAuction: auctionId,
      reason,
    });

     // Notify user
     await sendEmail(
      user.email,
      "Auction Suspened",
      `Your auction has been suspended. Reason: ${reason}`
    );

    res.status(200).json({ message: "Auction suspended successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error suspending auction", error: error.message });
  }
};

/**
 * ✅ Unsuspend an auction
 */
export const unsuspendAuction = async (req, res) => {
  try {
    const { auctionId, userId } = req.params;
    const { reason } = req.body;

    const auction = await Auction.findById(auctionId);
    if (!auction) return res.status(404).json({ message: "Auction not found" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    auction.isSuspended = false;
    await auction.save();

    // Log action
    await AdminAction.create({
      admin: req.user._id,
      actionType: "UNSUSPEND_AUCTION",
      targetAuction: auctionId,
      reason: "Admin lifted the suspension",
    });

     // Notify user
     await sendEmail(
      user.email,
      "Auction Suspended",
      `Your auction has been suspended. Reason: ${reason}`
    );

    res.status(200).json({ message: "Auction unsuspended successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error unsuspending auction", error: error.message });
  }
};

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
    console.error("[ERROR] Failed to fetch admin insights:", error.message);
    res
      .status(500)
      .json({ message: "Error fetching admin insights", error: error.message });
  }
};

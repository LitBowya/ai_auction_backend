import User from "../models/User.js";
import Order from "../models/Order.js";
import Payment from "../models/Payment.js";
import Auction from "../models/Auction.js";

/**
 * 🔹 1. Get User Profile (Protected)
 */
export const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params; // Extract userId from URL parameters
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("[ERROR] Fetching user profile failed:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch profile" });
  }
};

/**
 * 🔹 2. Update User Profile (Protected)
 */
export const updateUserProfile = async (req, res) => {
  try {
    const { userId } = req.params; // Extract userId from URL parameters
    const { name, email } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name, email },
      { new: true, runValidators: true }
    ).select("-password");

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("[ERROR] Updating user profile failed:", error.message);
    res.status(500).json({ success: false, message: "Profile update failed" });
  }
};

/**
 * 🔹 3. Get User Orders (Protected)
 */
export const getUserOrders = async (req, res) => {
  try {
    const { userId } = req.params; // Extract userId from URL parameters
    const orders = await Order.find({ buyer: userId }).populate("auction");
    res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error("[ERROR] Fetching user orders failed:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch orders" });
  }
};

/**
 * 🔹 4. Get User Payments (Protected)
 */
export const getUserPayments = async (req, res) => {
  try {
    const { userId } = req.params; // Extract userId from URL parameters
    const payments = await Payment.find({ buyer: userId }).populate("auction");
    res.status(200).json({ success: true, payments });
  } catch (error) {
    console.error("[ERROR] Fetching user payments failed:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch payments" });
  }
};

/**
 * 🔹 5. Get User Auctions (Protected)
 */
export const getUserAuctions = async (req, res) => {
  try {
    const { userId } = req.params; // Extract userId from URL parameters
    const auctions = await Auction.find({ highestBidder: userId });
    res.status(200).json({ success: true, auctions });
  } catch (error) {
    console.error("[ERROR] Fetching user auctions failed:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch auctions" });
  }
};

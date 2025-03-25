import User from "../models/User.js";
import Order from "../models/Order.js";
import Payment from "../models/Payment.js";
import Auction from "../models/Auction.js";
import mongoose from "mongoose";

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
    const { userId } = req.params;
    
    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid user ID format" 
      });
    }

    const orders = await Order.find({ buyer: userId })
      .populate({
        path: 'auction',
        populate: [
          {
            path: 'artwork',
            select: 'title description imageUrl category createdAt',
            populate: {
              path: 'category',
              select: 'name' // Only get category name
            }
          },
          {
            path: 'highestBidder',
            select: 'name email'
          }
        ]
      })
      .populate('payment', 'status amount') // Only get payment status and amount
      .populate('shipping', 'address trackingNumber') // Only get shipping essentials
      .sort({ createdAt: -1 }); // Sort by newest first

    if (!orders || orders.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: "No orders found",
        orders: [] 
      });
    }

    res.status(200).json({ 
      success: true, 
      orders 
    });

  } catch (error) {
    console.error("[ERROR] Fetching user orders failed:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch orders",
      error: error.message 
    });
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


export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .sort({ createdAt: -1 })

    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: "Users not found" });
    }

    res.status(200).json({ success: true, users });
  } catch (error) {
    console.error("[ERROR] Fetching users:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching users",
      error: error.message,
    });
  }
};
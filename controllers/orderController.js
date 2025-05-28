import Order from "../models/Order.js";
import mongoose from "mongoose";

export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate("buyer", "name email") // Populating only the 'name' field of the buyer
      .populate("shipping", "name address city postalCode contactNumber") // Populating the specific fields of the shipping
      .populate("auction", "highestBid artwork") // Populating 'auction' with 'highestBid' and 'artwork' field
      .populate({
        path: "auction.artwork", // Populating the artwork field inside the auction
        select: "title description", // Select the fields you want from the artwork
      });

    res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error("[ERROR] Fetching Orders:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching Orders",
      error: error.message,
    });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid order ID" });
    }

    // Optional: check req.user permissions here

    const order = await Order.findByIdAndUpdate(
      id,
      { status: "shipped" },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    res.status(200).json({
      success: true,
      message: "Order status updated to paid",
      order, // you can omit this if you prefer a 204 No Content
    });
  } catch (error) {
    console.error("[ERROR] Updating Order:", error);
    res.status(500).json({
      success: false,
      message: "Error updating order status",
      error: error.message,
    });
  }
};

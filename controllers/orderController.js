import Order from '../models/Order.js'

export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate("buyer", "name email")  // Populating only the 'name' field of the buyer
      .populate("shipping", "name address city postalCode contactNumber")  // Populating the specific fields of the shipping
      .populate("auction", "highestBid artwork")  // Populating 'auction' with 'highestBid' and 'artwork' field
      .populate({
        path: "auction.artwork",  // Populating the artwork field inside the auction
        select: "title description"  // Select the fields you want from the artwork
      });

    if (!orders || orders.length === 0) {
      return res.status(404).json({ success: false, message: "Orders not found" });
    }

    res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error("[ERROR] Fetching orders:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching orders",
      error: error.message,
    });
  }
};


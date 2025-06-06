import Payment from "../models/Payment.js";
import Auction from "../models/Auction.js";
import { sendEmail } from "../utils/email.js";
import paystack from "../utils/paystack.js";
import Shipping from "../models/Shipping.js";
import Order from "../models/Order.js";

/**
 * 🔹 Initiate Payment (Highest Bidder Only)
 */
export const initiatePayment = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const userId = req.user._id;
    const { shippingId } = req.body;

    // Fetch the auction details
    const auction = await Auction.findById(auctionId).populate("highestBidder");
    if (!auction) {
      return res
        .status(404)
        .json({ success: false, message: "Auction not found" });
    }

    // Ensure the auction is completed
    if (auction.status !== "completed") {
      return res
        .status(400)
        .json({ success: false, message: "Auction payment not available" });
    }

    // Ensure the user is the highest bidder
    if (auction.highestBidder._id.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized payment request" });
    }

    // Fetch the user's shipping details (if needed)
    const shipping = await Shipping.findById(shippingId); // Assuming shipping is tied to the user
    if (!shipping) {
      return res.status(404).json({
        success: false,
        message: "No shipping details found for the user",
      });
    }

    // Calculate the payment amount (convert to kobo for Paystack)
    const amount = auction.highestBid * 100; // Convert to kobo (Paystack format)
    const email = auction.highestBidder.email;

    // Initialize Paystack transaction
    const response = await paystack.transaction.initialize({
      email,
      amount,
      currency: "GHS",
      callback_url: `${process.env.FRONTEND_URL}/payment-confirmation`,
      metadata: { auctionId: auction._id, buyerId: auction.highestBidder._id },
    });

    if (!response.status) {
      return res
        .status(500)
        .json({ success: false, message: "Failed to initiate payment" });
    }

    // Save payment in the database (pending status)
    await Payment.create({
      auction: auction._id,
      buyer: auction.highestBidder._id,
      amount: auction.highestBid,
      reference: response.data.reference,
      shipping: shipping._id, // Link to the user's shipping details
      status: "pending",
    });

    // Return the payment URL to the frontend
    res.status(200).json({
      success: true,
      message: "Payment link generated successfully",
      paymentUrl: response.data.authorization_url,
      response,
    });
  } catch (error) {
    console.error("[ERROR] Payment initiation failed:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Error initiating payment" });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const { reference } = req.query;
    const { shippingId } = req.body;

    // Find the auction and get the buyer (highestBidder)
    const auction = await Auction.findById(auctionId).populate("highestBidder");
    if (!auction) {
      return res
        .status(404)
        .json({ success: false, message: "Auction not found" });
    }

    const shipping = await Shipping.findById(shippingId); // Assuming shipping is tied to the user
    if (!shipping) {
      return res.status(404).json({
        success: false,
        message: "No shipping details found for the user",
      });
    }

    const buyerId = auction.highestBidder._id; // This is the buyer

    // Find the payment associated with the auction
    const payment = await Payment.findOne({ auction: auctionId }).populate(
      "buyer"
    );
    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    }

    // Check if the payment reference exists
    if (!reference) {
      return res.status(400).json({
        success: false,
        message: "Payment reference is missing",
      });
    }

    const existingOrder = await Order.findOne({ payment: payment._id });
    if (existingOrder) {
      return res.status(200).json({
        success: true,
        message: "Order already exists for this payment.",
        orderId: existingOrder._id,
      });
    }

    // Verify payment status with Paystack
    let response;
    try {
      response = await paystack.transaction.verify({ reference });
    } catch (paystackError) {
      console.error(
        "[ERROR] Paystack verification failed:",
        paystackError.message
      );
      return res.status(500).json({
        success: false,
        message: "Error verifying payment with Paystack",
        error: paystackError.message,
      });
    }

    // Check Paystack response
    if (!response || !response.data || response.data.status !== "success") {
      console.error("Invalid Paystack response:", response); // Log the full response if validation fails
      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }

    // Ensure payment isn't already verified
    if (payment.status !== "pending") {
      return res.status(200).json({
        success: true,
        message: "Payment is already verified",
      });
    }

    const buyer = auction.highestBidder;

    // Update payment status to "paid"
    payment.status = "paid";
    payment.verified = true;
    await payment.save();

    // Create the order
    const order = await Order.create({
      auction: auction._id,
      buyer: auction.highestBidder._id,
      payment: payment._id,
      shipping: shipping._id,
    });

    // Notify Admin (Seller)
    await sendEmail(
      buyer.email,
      process.env.GMAIL_USER, // Admin is the seller
      "New Payment Received",
      `A payment has been verified for Auction: ${auction._id}. Please prepare for shipping.`
    );

    res.status(200).json({
      success: true,
      message: "Payment verified successfully, order created.",
      orderId: order._id,
    });
  } catch (error) {
    console.error("[ERROR] Payment verification failed:", error.message);
    res.status(500).json({
      success: false,
      message: "Error verifying payment",
      error: error.message,
    });
  }
};

/**
 * 🔹 Confirm Shipment by Seller
 */
export const confirmShipment = async (req, res) => {
  try {
    const { paymentId } = req.params;

    // Find payment and populate necessary relationships
    const payment = await Payment.findById(paymentId)
      .populate("buyer")
      .populate("shipping");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Update payment status
    payment.status = "shipped";
    payment.shipmentConfirmed = true;
    await payment.save();

    // Update associated order status
    const order = await Order.findOneAndUpdate(
      { payment: paymentId },
      {
        status: "shipped",
      },
      { new: true }
    );

    if (!order) {
      console.warn(`Payment ${paymentId} has no associated order`);
    }

    // Send shipping confirmation email
    await sendEmail(
      payment.buyer.email,
      "Artwork Shipped 🚚",
      `Your artwork has been shipped!. \\n. Check your profile to see order details`
    );

    res.status(200).json({
      success: true,
      message: "Shipment confirmed and order updated",
      payment,
      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Shipment confirmation failed",
      error: error.message,
    });
  }
};

export const getAllPayment = async (req, res) => {
  try {
    const payments = await Payment.find({}).populate("buyer", "name");

    if (!payments) {
      res.status(404).json({ success: false, message: "No Payments found" });
    }

    res.status(200).json({
      success: true,
      message: "Payments fetched successfully",
      payments,
    });
  } catch (error) {
    console.error("[ERROR] Fetching Payments", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

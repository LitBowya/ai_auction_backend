
import Payment from "../models/Payment.js";
import Auction from "../models/Auction.js";
import { sendEmail } from "../utils/email.js";
import paystack from "../utils/paystack.js";
import { createRecipient } from "../utils/createRecipient.js";
import Shipping from "../models/Shipping.js";

/**
 * 🔹 Initiate Payment (Highest Bidder Only)
 */
export const initiatePayment = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const userId = req.user._id; // Ensure the requester is the highest bidder

    const auction = await Auction.findById(auctionId).populate(
      "highestBidder seller"
    );

    const shipping = await Shipping.findOne({ auction: auctionId });
    if (!shipping) {
      return res.status(404).json({
        success: false,
        message: "No shipping details found for this auction.",
      });
    }

    if (!auction.payoutMethod && auction.paymentDetails) {
      return res.status(400).json({
        success: false,
        message: "Payment details of auction were not set",
      });
    }

    if (!auction)
      return res
        .status(404)
        .json({ success: false, message: "Auction not found" });

    // Ensure auction is completed
    if (auction.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Auction payment not available",
      });
    }

    // Ensure user is the highest bidder
    if (auction.highestBidder._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized payment request, You are not the highest bidder",
      });
    }

    const amount = auction.highestBid * 100; // Convert to kobo (Paystack format)
    const email = auction.highestBidder.email;

    // Initialize Paystack transaction
    const response = await paystack.transaction.initialize({
      email,
      amount,
      currency: "GHS",
      callback_url: `${process.env.FRONTEND_URL}/payment-confirmation?reference={reference}`,
      metadata: {
        auctionId: auction._id,
        buyerId: auction.highestBidder._id,
        sellerId: auction.seller._id,
      },
    });

    // Notify Seller
    await sendEmail(
      auction.seller.email,
      "Payment sent to paystack",
      `Verify on the site and ship the item to the buyer`
    );

    if (!response.status) {
      return res.status(500).json({
        success: false,
        message: "Failed to initiate payment",
      });
    }

    // Save payment reference in database (pending status)
    await Payment.create({
      auction: auction._id,
      buyer: auction.highestBidder._id,
      seller: auction.seller._id,
      amount: auction.highestBid,
      payoutMethod: auction.payoutMethod,
      payoutDetails: auction.payoutDetails,
      reference: response.data.reference,
      shipping: shipping._id,
      status: "pending",
    });

    res.status(200).json({
      success: true,
      message: "Payment link generated successfully",
      paymentUrl: response.data.authorization_url,
    });
  } catch (error) {
    console.error("[ERROR] Payment initiation failed:", error.message);
    res.status(500).json({
      success: false,
      message: "Error initiating payment",
      error: error.message,
    });
  }
};

/**
 * 🔹 Paystack Webhook: Auto-Verify Payment
 */
export const verifyPayment = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const userId = req.user._id; // Ensure the requester is the owner

    // Find the auction
    const auction = await Auction.findById(auctionId).populate("seller");
    if (!auction)
      return res
        .status(404)
        .json({ success: false, message: "Auction not found" });

    // Ensure user is the owner of the auction
    if (auction.seller._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized payment verification, You are not the owner",
      });
    }

    // Find the payment associated with the auction
    const payment = await Payment.findOne({ auction: auctionId }).populate(
      "seller"
    );
    if (!payment)
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });

    const reference = payment.reference;

    // Verify payment status with Paystack
    let response;
    try {
      // Pass the reference as an object
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

    // Check the response structure
    if (!response || !response.data || response.data.status !== "success") {
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

    // Update payment status to "paid"
    payment.status = "paid";
    await payment.save();

    // Notify Seller
    await sendEmail(
      payment.seller.email,
      "Payment Received",
      `The buyer has paid. Please ship the artwork.`
    );

    res.status(200).json({
      success: true,
      message: "Payment verified successfully",
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
    const payment = await Payment.findById(paymentId).populate(
      "buyer",
      "email"
    );

    if (!payment)
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });

    payment.status = "shipped";
    payment.shipmentConfirmed = true;
    await payment.save();

    await sendEmail(
      payment.buyer.email,
      "Artwork shipped",
      `Your bought product have been shipped.`
    );

    res.status(200).json({
      success: true,
      message: "Shipment confirmed",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Shipment confirmation failed",
      error: error.message,
    });
  }
};

import cron from "node-cron";
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

/**
 * 🔹 Buyer Confirms Receipt & Funds Released to Seller
 */
export const confirmReceipt = async (req, res) => {
  try {
    const { paymentId } = req.params;

    // ✅ Find the payment
    const payment = await Payment.findById(paymentId).populate(
      "seller",
      "email"
    );

    if (!payment) {
      console.error("[ERROR] Payment not found");
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    }

    // ✅ Use `.get()` to fetch payout details directly from the Map
    const payoutDetails = payment.payoutDetails;
    const accountNumber = payoutDetails.get("account_number");
    const bankCode = payoutDetails.get("bank_code");
    const momoNumber = payoutDetails.get("momoNumber");
    const network = payoutDetails.get("network");
    let recipientCode = payoutDetails.get("recipientCode");

    if (!recipientCode) {
      // ✅ Create a recipient dynamically based on payout method
      let recipientPayload;
      switch (payment.payoutMethod) {
        case "bank_transfer":
          if (!accountNumber || !bankCode) {
            console.error("[ERROR] Missing bank details");
            return res.status(400).json({
              success: false,
              message: "Bank account details are required",
            });
          }

          recipientPayload = {
            type: "ghipss",
            name: payment.seller.email,
            account_number: accountNumber,
            bank_code: bankCode,
            currency: "GHS",
          };
          break;

        case "momo":
          if (!momoNumber || !network) {
            console.error("[ERROR] Missing momo details");
            return res.status(400).json({
              success: false,
              message: "Mobile Money details are required",
            });
          }

          recipientPayload = {
            type: "mobile_money",
            name: payment.seller.email,
            account_number: momoNumber, // using phone for mobile money
            bank_code: network, // using network key
            currency: "GHS",
          };
          break;

        default:
          console.error(
            "[ERROR] Unsupported payout method:",
            payment.payoutMethod
          );
          return res.status(400).json({
            success: false,
            message: "Unsupported payout method",
          });
      }

      // Use axios based function to create the recipient
      const recipientResponse = await createRecipient(recipientPayload);

      if (!recipientResponse.status) {
        console.error(
          "[ERROR] Recipient creation failed:",
          recipientResponse.message
        );
        return res.status(400).json({
          success: false,
          message: "Recipient creation failed",
          error: recipientResponse.message,
        });
      }

      // ✅ Save recipientCode
      recipientCode = recipientResponse.data.recipient_code;
      payoutDetails.set("recipientCode", recipientCode);
      await payment.save();
    }

    // ✅ Ensure paystack.transfer.create exists in your SDK (if supported), else use a similar axios call for transfer
    if (!paystack.transfer || typeof paystack.transfer.create !== "function") {
      console.error("[ERROR] Paystack transfer.create is undefined");
      throw new Error("Paystack transfer.create method is not available");
    }

    // ✅ Initiate Paystack Transfer using the available SDK function
    const transferResponse = await paystack.transfer.create({
      source: "balance",
      amount: payment.amount * 100, // Convert to kobo or the smallest currency unit
      recipient: recipientCode,
      reason: "Auction Payment",
    });

    if (!transferResponse.status) {
      console.error("[ERROR] Transfer failed:", transferResponse.message);
      return res.status(400).json({
        success: false,
        message: "Transfer to seller failed",
        error: transferResponse.message,
      });
    }

    // ✅ Update payment status
    payment.status = "confirmed";
    payment.buyerConfirmed = true;
    await payment.save();

    // ✅ Notify Seller
    await sendEmail(
      payment.seller.email,
      "Order received",
      "Your shipped order has been received"
    );

    res.status(200).json({
      success: true,
      message: "Receipt confirmed, funds released to seller",
    });
  } catch (error) {
    console.error("[ERROR] Error confirming receipt:", error.message);
    res.status(500).json({
      success: false,
      message: "Error confirming receipt",
      error: error.message,
    });
  }
};

export const processRefunds = async () => {
  try {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // Find payments that are 'paid' but not marked as 'shipped' for over 3 days
    const overduePayments = await Payment.find({
      status: "paid",
      shipmentConfirmed: false,
      updatedAt: { $lte: threeDaysAgo },
    });

    for (const payment of overduePayments) {
      // Initiate Paystack Refund
      const response = await paystack.refund.create({
        transaction: payment.reference,
      });

      if (response.status) {
        payment.status = "refunded";
        await payment.save();

        // Notify Buyer
        await sendEmail(
          payment.buyer.email,
          "Refund Processed",
          "The seller did not ship your item within 3 days. Your payment has been refunded."
        );
      } else {
        console.error(`[ERROR] Refund failed for Payment ID: ${payment._id}`);
      }
    }
  } catch (error) {
    console.error("[ERROR] Refund processing failed:", error.message);
  }
};

// 🔹 Schedule Job to Run Every 24 Hours at Midnight
cron.schedule("0 0 * * *", processRefunds);

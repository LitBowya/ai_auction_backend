import Auction from "../models/Auction.js";
import Bid from "../models/Bid.js";
import Notification from "../models/Notification.js";
import { sendEmail } from "../utils/email.js";
import agenda from "../config/agenda.js";

/**
 * Place a bid on an auction
 */

export const getAllBids = async (req, res) => {
  try {
    const bids = await Bid.find({});

    if (!bids) {
      res.status(200).json({ success: false, message: "No Bids" });
    }

    res.status(200).json({ success: true, bids });
  } catch (error) {
    console.error("An error occurred", error);
    res
      .status(500)
      .json({ success: false, message: "An error occurred", error: error });
  }
};

export const placeBid = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const { amount } = req.body;
    const userId = req.user._id;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Bid amount must be greater than zero!",
      });
    }

    const auction = await Auction.findById(auctionId)
      .populate("artwork", "title")
      .populate("highestBidder", "name email");

    if (!auction || auction.status !== "active") {
      return res
        .status(404)
        .json({ success: false, message: "Auction not available" });
    }

    const now = new Date();
    if (now < new Date(auction.startingTime)) {
      return res.status(400).json({
        success: false,
        message: "Auction has not started yet!",
      });
    }

    if (now >= new Date(auction.biddingEndTime)) {
      return res.status(400).json({
        success: false,
        message: "Auction has already ended!",
      });
    }

    if (auction.highestBid === 0 && amount < auction.startingPrice) {
      return res.status(400).json({
        success: false,
        message: `Bid must be at least GHS ${auction.startingPrice}!`,
      });
    }

    if (amount <= auction.highestBid) {
      return res.status(400).json({
        success: false,
        message: `Bid must be higher than GHS ${auction.highestBid}!`,
      });
    }

    if (auction.maxBidLimit && amount > auction.maxBidLimit) {
      return res.status(400).json({
        success: false,
        message: `Bid cannot exceed the maximum limit of GHS ${auction.maxBidLimit}!`,
      });
    }

    // Check if max bid limit was reached
    if (auction.maxBidLimit && amount === auction.maxBidLimit) {
      auction.status = "completed";
      auction.biddingEndTime = new Date();

      await sendEmail(
        req.user.email,
        "You’ve won the auction!",
        `You have successfully won the auction for "${auction.artwork.title}" by reaching the max bid limit.`
      );
    }

    // Notify previous highest bidder
    if (
      auction.highestBidder &&
      auction.highestBidder._id.toString() !== userId.toString()
    ) {
      const previousBidderName = auction.highestBidder.name;
      const artworkName = auction.artwork.title;

      await Notification.create({
        user: auction.highestBidder._id,
        message: `Hey ${previousBidderName}, you have been outbid on Auction "${artworkName}".`,
        type: "outbid",
      });

      await sendEmail(
        auction.highestBidder.email,
        "You've been outbid!",
        `Hey ${previousBidderName}, someone has placed a higher bid on Auction "${artworkName}". Place a new bid now!`
      );
    }

    // Create the bid
    const bid = await Bid.create({
      auction: auctionId,
      bidder: userId,
      amount,
    });

    // Update auction with new bid
    auction.highestBid = amount;
    auction.highestBidder = userId;
    auction.bids.push(bid._id);

    let auctionEnded = false;

    

    await auction.save();

    res.status(201).json({
      success: true,
      message: auctionEnded
        ? "Bid placed and auction ended — max bid reached!"
        : "Bid placed successfully",
      bid,
    });
  } catch (error) {
    console.error("[ERROR] Bidding failed:", error.message);
    res.status(500).json({
      success: false,
      message: "Bidding failed",
      error: error.message,
    });
  }
};

export const getAuctionBids = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const bids = await Bid.find({ auction: auctionId })
      .sort({ amount: -1 })
      .populate("bidder", "name email");

    res.status(200).json({
      success: true,
      message: "Auction bid history retrieved successfully",
      bids,
    });
  } catch (error) {
    console.error("[ERROR] Fetching bid history failed:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching bid history",
      error: error.message,
    });
  }
};

export const getUserBids = async (req, res) => {
  try {
    const userId = req.user._id;
    const bids = await Bid.find({ bidder: userId })
      .populate("auction", "title highestBid biddingEndTime")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "User bid history retrieved successfully",
      bids,
    });
  } catch (error) {
    console.error("[ERROR] Fetching user bid history failed:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching user bids",
      error: error.message,
    });
  }
};

export const getAuctionHighestBid = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const auction = await Auction.findById(auctionId).populate(
      "highestBidder",
      "name"
    );

    if (!auction) {
      return res
        .status(404)
        .json({ success: false, message: "Auction not found" });
    }

    res.status(200).json({
      success: true,
      message: "Highest bid retrieved successfully",
      highestBid: auction.highestBid,
      highestBidder: auction.highestBidder,
    });
  } catch (error) {
    console.error("[ERROR] Fetching highest bid failed:", error.message);
    res.status(500).json({
      success: false,
      message: "Error retrieving highest bid",
      error: error.message,
    });
  }
};

export const autoEndAuction = async () => {
  try {
    const now = new Date();
    const expiredAuctions = await Auction.find({
      biddingEndTime: { $lte: now },
      status: "active",
    });

    for (const auction of expiredAuctions) {
      auction.status = "completed";
      await auction.save();
    }
  } catch (error) {
    console.error("[ERROR] Auto-ending Auctions failed:", error.message);
  }
};

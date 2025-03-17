import Auction from "../models/Auction.js";
import Bid from "../models/Bid.js";
import Notification from "../models/Notification.js";
import redis from "../utils/redisClient.js";
import { sendEmail } from "../utils/email.js";

/**
 * Place a bid on an auction
 */
export const placeBid = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const { amount } = req.body;
    const userId = req.user._id;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Bid amount must be greater than zero!" });
    }

    const auction = await Auction.findById(auctionId)
      .populate("artwork", "title")
      .populate("highestBidder", "name email");
    
    if (!auction || auction.status !== "active") {
      return res.status(404).json({ success: false, message: "Auction not available" });
    }

    if (auction.seller.toString() === userId.toString()) {
      return res.status(403).json({ success: false, message: "You cannot bid on your own auction!" });
    }

    if (new Date() < new Date(auction.startingTime)) {
      return res.status(400).json({ success: false, message: "Auction has not started yet!" });
    }

    if (new Date() >= new Date(auction.biddingEndTime)) {
      return res.status(400).json({ success: false, message: "Auction has already ended!" });
    }

    if (auction.highestBid === 0 && amount < auction.startingPrice) {
      return res.status(400).json({ success: false, message: `Bid must be at least GHS ${auction.startingPrice}!` });
    }

    if (amount <= auction.highestBid) {
      return res.status(400).json({ success: false, message: `Bid must be higher than GHS ${auction.highestBid}!` });
    }

    if (auction.maxBidLimit && amount > auction.maxBidLimit) {
      return res.status(400).json({
        success: false,
        message: `Bid cannot exceed the maximum limit of GHS ${auction.maxBidLimit}!`,
      });
    }

    if (auction.highestBidder && auction.highestBidder._id.toString() !== userId.toString()) {
      const previousBidderName = auction.highestBidder.name;
      const artworkName = auction.artwork.title;

      await Notification.create({
        user: auction.highestBidder._id,
        message: `Hey ${previousBidderName}, you have been outbid on Auction ${artworkName}.`,
        type: "outbid",
      });

      await sendEmail(
        auction.highestBidder.email,
        "You've been outbid!",
        `Hey ${previousBidderName}, someone has placed a higher bid on Auction ${artworkName}. Place a new bid now!`
      );
    }

    const bid = await Bid.create({ auction: auctionId, bidder: userId, amount });
    auction.highestBid = amount;
    auction.highestBidder = userId;
    auction.bids.push(bid._id);
    await auction.save();

    await redis.hset(`auction:${auctionId}`, { highestBid: amount, highestBidder: userId.toString() });

    res.status(201).json({ success: true, message: "Bid placed successfully", bid });
  } catch (error) {
    console.error("[ERROR] Bidding failed:", error.message);
    res.status(500).json({ success: false, message: "Bidding failed", error: error.message });
  }
};

export const getAuctionBids = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const bids = await Bid.find({ auction: auctionId }).sort({ amount: -1 }).populate("bidder", "name email");

    res.status(200).json({ success: true, message: "Auction bid history retrieved successfully", bids });
  } catch (error) {
    console.error("[ERROR] Fetching bid history failed:", error.message);
    res.status(500).json({ success: false, message: "Error fetching bid history", error: error.message });
  }
};

export const getUserBids = async (req, res) => {
  try {
    const userId = req.user._id;
    const bids = await Bid.find({ bidder: userId }).populate("auction", "title highestBid biddingEndTime").sort({ createdAt: -1 });

    res.status(200).json({ success: true, message: "User bid history retrieved successfully", bids });
  } catch (error) {
    console.error("[ERROR] Fetching user bid history failed:", error.message);
    res.status(500).json({ success: false, message: "Error fetching user bids", error: error.message });
  }
};

export const getAuctionHighestBid = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const auction = await Auction.findById(auctionId).populate("highestBidder", "name");

    if (!auction) {
      return res.status(404).json({ success: false, message: "Auction not found" });
    }

    res.status(200).json({ success: true, message: "Highest bid retrieved successfully", highestBid: auction.highestBid, highestBidder: auction.highestBidder });
  } catch (error) {
    console.error("[ERROR] Fetching highest bid failed:", error.message);
    res.status(500).json({ success: false, message: "Error retrieving highest bid", error: error.message });
  }
};

export const autoEndAuction = async () => {
  try {
    const now = new Date();
    const expiredAuctions = await Auction.find({ biddingEndTime: { $lte: now }, status: "active" });

    for (const auction of expiredAuctions) {
      auction.status = "completed";
      await auction.save();
    }
  } catch (error) {
    console.error("[ERROR] Auto-ending auctions failed:", error.message);
  }
};

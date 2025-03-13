import Auction from "../models/Auction.js";
import Bid from "../models/Bid.js";
import Notification from "../models/Notification.js";
import { detectBot } from "../utils/botDetection.js";
import redis from "../utils/redisClient.js";
import { sendEmail } from "../utils/email.js";

/**
 * Place a bid on an auction
 */
export const placeBid = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const { bidAmount } = req.body;
    const userId = req.user._id;


    // Retrieve auction
    const auction = await Auction.findById(auctionId)
      .populate("artwork", "title")
      .populate("highestBidder", "name email");
    if (!auction || auction.status !== "active") {
      return res.status(404).json({ message: "Auction not available" });
    }

    // Prevent owner from bidding on their own auction
    if (auction.seller.toString() === userId.toString()) {
      return res
        .status(403)
        .json({ message: "You cannot bid on your own auction!" });
    }

    // Check if auction has started
    if (new Date() < new Date(auction.startingTime)) {
      return res.status(400).json({ message: "Auction has not started yet!" });
    }

    // Check if auction has ended
    if (new Date() >= new Date(auction.biddingEndTime)) {
      return res.status(400).json({ message: "Auction has already ended!" });
    }

    // Validate bid amount
    if (!bidAmount || bidAmount <= 0) {
      return res
        .status(400)
        .json({ message: "Bid amount must be greater than zero!" });
    }

    // Ensure bid is above starting price if no bids exist
    if (auction.highestBid === 0 && bidAmount < auction.startingPrice) {
      return res.status(400).json({
        message: `Bid must be at least $${auction.startingPrice}!`,
      });
    }

    // Ensure bid is higher than the current highest bid
    if (bidAmount <= auction.highestBid) {
      return res
        .status(400)
        .json({ message: `Bid must be higher than $${auction.highestBid}!` });
    }

    // Notify previous highest bidder
    if (
      auction.highestBidder &&
      auction.highestBidder._id.toString() !== userId.toString()
    ) {
      const previousBidderName = auction.highestBidder.name; // Get the name
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

    // Save bid
    const bid = await Bid.create({
      auction: auctionId,
      bidder: userId,
      amount: bidAmount,
    });

    // Update auction with new highest bid
    auction.highestBid = bidAmount;
    auction.highestBidder = userId;
    auction.bids.push(bid._id);
    await auction.save();

    // Store in Redis
    await redis.hset(`auction:${auctionId}`, {
      highestBid: bidAmount,
      highestBidder: userId.toString(),
    });


    res.status(201).json({
      message: "Bid placed successfully",
      bid,
    });
  } catch (error) {
    console.error("[ERROR] Bidding failed:", error.message);
    res.status(500).json({ message: "Bidding failed", error: error.message });
  }
};

export const getAuctionBids = async (req, res) => {
  try {
    const { auctionId } = req.params;

    // Find all bids for the auction, sorted by highest amount
    const bids = await Bid.find({ auction: auctionId })
      .sort({ amount: -1 })
      .populate("bidder", "name email");

    res.status(200).json({
      message: "Auction bid history retrieved successfully",
      bids,
    });
  } catch (error) {
    console.error("[ERROR] Fetching bid history failed:", error.message);
    res
      .status(500)
      .json({ message: "Error fetching bid history", error: error.message });
  }
};

export const getUserBids = async (req, res) => {
  try {
    const userId = req.user._id;

    const bids = await Bid.find({ bidder: userId })
      .populate("auction", "title highestBid biddingEndTime")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "User bid history retrieved successfully",
      bids,
    });
  } catch (error) {
    console.error("[ERROR] Fetching user bid history failed:", error.message);
    res
      .status(500)
      .json({ message: "Error fetching user bids", error: error.message });
  }
};

export const getAuctionHighestBid = async (req, res) => {
  try {
    const { auctionId } = req.params;

    // Find auction
    const auction = await Auction.findById(auctionId).populate(
      "highestBidder",
      "name"
    );

    if (!auction) {
      return res.status(404).json({ message: "Auction not found" });
    }

    res.status(200).json({
      message: "Highest bid retrieved successfully",
      highestBid: auction.highestBid,
      highestBidder: auction.highestBidder,
    });
  } catch (error) {
    console.error("[ERROR] Fetching highest bid failed:", error.message);
    res
      .status(500)
      .json({ message: "Error retrieving highest bid", error: error.message });
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
    console.error("[ERROR] Auto-ending auctions failed:", error.message);
  }
};

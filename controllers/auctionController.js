import Auction from "../models/Auction.js";
import Artwork from "../models/Artwork.js";
import Notification from "../models/Notification.js";
import { body, validationResult } from "express-validator";
import { sendEmail } from "../utils/email.js";
import { logAction } from "./auditLogController.js";

/**
 * Helper function to notify the highest bidder
 */
const notifyHighestBidder = async (auction) => {
  if (auction.highestBidder) {


    const artworkTitle = auction.artwork.title;

    // 📩 **Email Notification**
    await sendEmail(
      auction.highestBidder.email,
      "Auction Won: Payment Required",
      `Congratulations! You won the auction for "${artworkTitle}". Complete payment on the site.`
    );

    // 🔔 **Database Notification**
    await Notification.create({
      user: auction.highestBidder._id,
      message: `You won the auction for "${artworkTitle}". Complete payment on the site.`,
      type: "payment_due",
    });
  }
};

/**
 * Create an Auction
 */
export const createAuction = async (req, res) => {
  await Promise.all([
    body("artworkId").notEmpty().withMessage("Artwork ID is required").run(req),
    body("categoryId")
      .notEmpty()
      .withMessage("Category ID is required")
      .run(req),
    body("startingPrice")
      .isNumeric()
      .withMessage("Valid starting price is required")
      .run(req),

    body("startingTime")
      .isISO8601()
      .withMessage("Valid starting time is required")
      .run(req),
    body("biddingEndTime")
      .isISO8601()
      .withMessage("Valid end time is required")
      .run(req),
    body("payoutMethod")
      .isIn(["visa", "bank_transfer", "momo"])
      .withMessage("Invalid payout method")
      .run(req),
    body("payoutDetails")
      .notEmpty()
      .withMessage("Payout details required")
      .run(req),
  ]);

  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  try {
    const {
      artworkId,
      categoryId,
      startingPrice,
      startingTime,
      biddingEndTime,
      payoutMethod,
      payoutDetails,
    } = req.body;

    const artwork = await Artwork.findById(artworkId);
    if (!artwork) return res.status(404).json({ message: "Artwork not found" });

    if (artwork.owner.toString() !== req.user._id.toString())
      return res
        .status(403)
        .json({ message: "You are not the owner of this artwork" });

    const auction = await Auction.create({
      artwork: artworkId,
      seller: req.user._id,
      category: categoryId,
      startingPrice,
      startingTime,
      biddingEndTime,
      payoutMethod,
      payoutDetails,
      status: "active",
    });

    // ✅ **Automate Auction End, Notify Winner via Email & Notification**
    setTimeout(
      async () => {
        const updatedAuction = await Auction.findById(auction._id)
          .populate("highestBidder", "name email")
          .populate("artwork", "title");

        if (updatedAuction && updatedAuction.status === "active") {
          updatedAuction.status = "completed";
          await updatedAuction.save();

          // Notify the highest bidder
          await notifyHighestBidder(updatedAuction);
        }
      },
      new Date(biddingEndTime) - new Date()
    );

    await logAction(
      req.user,
      "Auction Created",
      `Auction for Artwork ID: ${artworkId} starting at ${startingTime}`,
      req.ip
    );

    res.status(201).json({ message: "Auction created successfully", auction });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating auction", error: error.message });
  }
};

/**
 * End an auction (Only owner can end it)
 */
export const endAuction = async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id)
      .populate("highestBidder", "name email")
      .populate("artwork", "title");
    if (!auction) return res.status(404).json({ message: "Auction not found" });

    if (auction.seller.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "You are not the owner of this auction" });
    }

    if (auction.status === "active") {
      auction.status = "completed";
      await auction.save();

      // Notify the highest bidder
      await notifyHighestBidder(auction);
    }

    res.json({ message: "Auction ended successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error ending auction", error: error.message });
  }
};

/**
 * Get all active auctions
 */
export const getActiveAuctions = async (req, res) => {
  try {
    const auctions = await Auction.find({ status: "active" })
      .populate("artwork")
      .populate("seller", "name email");
    res.json(auctions);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching auctions", error: error.message });
  }
};

/**
 * Get all active auctions
 */
export const getAllAuctions = async (req, res) => {
  try {
    const auctions = await Auction.find({}).populate(
      "artwork seller",
      "title description imageUrl name email"
    );
    res.status(200).json(auctions);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching auctions", error: error.message });
  }
};

export const getAuction = async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id).populate(
      "artwork seller",
      "title description imageUrl name email"
    );

    res.status(200).json({message: "Auction successfully fetched", auction});
  } catch (error) {
    res
    .status(500)
    .json({ message: "Error fetching auctions", error: error.message });
  }
};

export const getLatestAuction = async (req, res) => {
  try {
    // Find the latest auction based on the createdAt field (most recent first)
    const latestAuction = await Auction.findOne({})
    .sort({ createdAt: -1 })
    .populate("artwork seller", "title description imageUrl name email");

    if (!latestAuction) {
      return res.status(404).json({ message: "No auctions found." });
    }

    res.status(200).json(latestAuction);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching the latest auction",
      error: error.message,
    });
  }
};

/**
 * Delete an auction (Only owner can delete it)
 */
export const deleteAuction = async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id);
    if (!auction) return res.status(404).json({ message: "Auction not found" });

    if (auction.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized action" });
    }

    await auction.deleteOne();
    await logAction(
      req.user,
      "Auction Deleted",
      `Deleted Auction ID: ${auction._id}`,
      req.ip
    );

    res.status(200).json({ message: "Auction deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting auction", error: error.message });
  }
};

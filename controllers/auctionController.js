import Auction from "../models/Auction.js";
import Artwork from "../models/Artwork.js";
import Notification from "../models/Notification.js";
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
 * Create a new auction
 */
export const createAuction = async (req, res) => {
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

    // Validate required fields
    if (!artworkId || !startingPrice || !startingTime || !biddingEndTime) {
      return res.status(400).json({
        success: false,
        message: "Missing required auction information"
      });
    }

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(artworkId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid artwork ID format"
      });
    }

    // Validate dates
    const currentDate = new Date();
    const startDate = new Date(startingTime);
    const endDate = new Date(biddingEndTime);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format"
      });
    }

    if (endDate <= startDate) {
      return res.status(400).json({
        success: false,
        message: "Bidding end time must be after starting time"
      });
    }

    const artwork = await Artwork.findById(artworkId);
    if (!artwork) {
      return res.status(404).json({
        success: false,
        message: "Artwork not found"
      });
    }

    if (artwork.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false, 
        message: "You are not the owner of this artwork"
      });
    }

    const auction = await Auction.create({
      artwork: artworkId,
      seller: req.user._id,
      categoryId,
      startingPrice,
      startingTime,
      biddingEndTime,
      payoutMethod,
      payoutDetails,
      status: "pending",
    });

    // Automate Auction End, Notify Winner via Email & Notification
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

    res.status(201).json({
      success: true,
      message: "Auction created successfully",
      data: auction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating auction",
      error: error.message
    });
  }
};

/**
 * End an auction (Only owner can end it)
 */
export const endAuction = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate if ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid auction ID format"
      });
    }

    const auction = await Auction.findById(id)
      .populate("highestBidder", "name email")
      .populate("artwork", "title");
      
    if (!auction) {
      return res.status(404).json({
        success: false,
        message: "Auction not found"
      });
    }

    if (auction.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not the owner of this auction"
      });
    }

    if (auction.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Auction is already completed"
      });
    }

    if (auction.status === "active") {
      auction.status = "completed";
      await auction.save();

      // Notify the highest bidder
      await notifyHighestBidder(auction);

      await logAction(
        req.user,
        "Auction Ended",
        `Auction ID: ${id} ended manually by seller`,
        req.ip
      );

      return res.status(200).json({
        success: true,
        message: "Auction ended successfully",
        data: auction
      });
    }

    res.status(400).json({
      success: false,
      message: `Cannot end auction with status: ${auction.status}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error ending auction",
      error: error.message
    });
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
    
    if (auctions.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No active auctions found",
        data: []
      });
    }
    
    res.status(200).json({
      success: true,
      message: "Active auctions retrieved successfully",
      data: auctions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching active auctions",
      error: error.message
    });
  }
};

/**
 * Get all auctions
 */
export const getAllAuctions = async (req, res) => {
  try {
    const auctions = await Auction.find({}).populate(
      "artwork seller",
      "title description imageUrl name email"
    );
    
    // Check if any auctions were found
    if (auctions.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: "No auctions found", 
        data: [] 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: "Auctions successfully retrieved", 
      data: auctions 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Error fetching auctions", 
      error: error.message 
    });
  }
};

export const getAuction = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate if ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid auction ID format" 
      });
    }

    const auction = await Auction.findById(id).populate(
      "artwork seller",
      "title description imageUrl name email"
    );

    // Check if auction exists
    if (!auction) {
      return res.status(404).json({ 
        success: false, 
        message: "Auction not found" 
      });
    }

    res.status(200).json({
      success: true, 
      message: "Auction successfully fetched", 
      data: auction
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Error fetching auction", 
      error: error.message 
    });
  }
};

/**
 * Get the latest auction
 */
export const getLatestAuction = async (req, res) => {
  try {
    // Find the latest auction based on the createdAt field (most recent first)
    const latestAuction = await Auction.findOne({})
      .sort({ createdAt: -1 })
      .populate("artwork seller", "title description imageUrl name email");

    if (!latestAuction) {
      return res.status(404).json({ 
        success: false,
        message: "No auctions found." 
      });
    }

    res.status(200).json({
      success: true,
      message: "Latest auction retrieved successfully",
      data: latestAuction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
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
    const { id } = req.params;

    // Validate if ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid auction ID format"
      });
    }

    const auction = await Auction.findById(id);
    
    if (!auction) {
      return res.status(404).json({ 
        success: false,
        message: "Auction not found" 
      });
    }

    if (auction.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: "Unauthorized action. You must be the auction owner to delete it." 
      });
    }

    // Check if auction has bids and is active
    if (auction.status === "active" && auction.bids && auction.bids.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete an active auction that has bids"
      });
    }

    await auction.deleteOne();
    
    await logAction(
      req.user,
      "Auction Deleted",
      `Deleted Auction ID: ${auction._id}`,
      req.ip
    );

    res.status(200).json({ 
      success: true,
      message: "Auction deleted successfully" 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: "Error deleting auction", 
      error: error.message 
    });
  }
};
import Auction from "../models/Auction.js";
import Artwork from "../models/Artwork.js";
import { notifyHighestBidder } from "../utils/notification.js";
import { auctionStartQueue, auctionEndQueue } from "../config/bullConfig.js";
import mongoose from "mongoose";
import { logAction } from "./auditLogController.js";

/**
 * Create a new auction
 */
export const createAuction = async (req, res) => {
  try {
    const {
      artworkId,
      category,
      startingPrice,
      maxBidLimit,
      startingTime,
      biddingEndTime,
    } = req.body;

    // Validate required fields
    if (!artworkId || !category || !startingPrice || !startingTime || !biddingEndTime) {
      return res.status(400).json({
        success: false,
        message: "Missing required auction information",
      });
    }

    // Validate max bid limit
    if (maxBidLimit && maxBidLimit <= startingPrice) {
      return res.status(400).json({
        success: false,
        message: "Max bid limit must be higher than starting price",
      });
    }

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(artworkId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid artwork ID format",
      });
    }

    // Validate dates
    const startDate = new Date(startingTime);
    const endDate = new Date(biddingEndTime);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format",
      });
    }

    if (endDate <= startDate) {
      return res.status(400).json({
        success: false,
        message: "Bidding end time must be after starting time",
      });
    }

    const artwork = await Artwork.findById(artworkId);
    if (!artwork) {
      return res.status(404).json({
        success: false,
        message: "Artwork not found",
      });
    }

    const auction = await Auction.create({
      artwork: artworkId,
      seller: req.user._id,
      category,
      startingPrice,
      maxBidLimit, // ✅ Save max bid limit
      startingTime,
      biddingEndTime,
      status: "pending",
    });

    // Schedule job to start the auction
    await auctionStartQueue.add(
      "startAuction",
      { auctionId: auction._id },
      { delay: startDate - new Date() }
    );

    // Schedule job to end the auction
    await auctionEndQueue.add(
      "endAuction",
      { auctionId: auction._id },
      { delay: endDate - new Date() }
    );

    res.status(201).json({
      success: true,
      message: "Auction created successfully and scheduled",
      data: auction,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating auction",
      error: error.message,
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
    const auctions = await Auction.find({ status: "active"})
      .populate("artwork")
      .populate("title, description, imageUrl, category");
    
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
      "artwork",
      "title description imageUrl"
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
      "artwork",
      "title description imageUrl"
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
    const latestAuction = await Auction.find({})
      .sort({ createdAt: -1 }).limit(3)
      .populate("artwork", "title description imageUrl");

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

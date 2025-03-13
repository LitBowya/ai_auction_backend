import mongoose from "mongoose";

const auctionSchema = new mongoose.Schema(
  {
    artwork: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Artwork",
      required: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    startingPrice: { type: Number, required: true },
    highestBid: { type: Number, default: 0 },
    highestBidder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    startingTime: { type: Date, required: true },
    biddingEndTime: { type: Date, required: true },
    status: {
      type: String,
      enum: ["pending", "active", "completed"],
      default: "pending",
    },
    bids: [{ type: mongoose.Schema.Types.ObjectId, ref: "Bid" }],
    payoutMethod: {
      type: String,
      enum: ["visa", "bank_transfer", "momo"],
      required: true,
    },
    payoutDetails: {
      type: Map,
      of: String,
      required: true,
    },
    isSuspended: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Auction", auctionSchema);

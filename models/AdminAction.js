import mongoose from "mongoose";

const adminActionSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    actionType: {
      type: String,
      enum: ["BAN_USER", "UNBAN_USER", "SUSPEND_AUCTION", "UNSUSPEND_AUCTION"],
      required: true,
    },
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    targetAuction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auction",
      default: null,
    },
    reason: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("AdminAction", adminActionSchema);

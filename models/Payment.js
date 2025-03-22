import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    auction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auction",
      required: true,
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "paid", "shipped", "confirmed", "refunded"],
      default: "pending",
    },
    shipmentConfirmed: { type: Boolean, default: false },
    reference: { type: String, unique: true },
    shipping: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shipping",
      required: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Payment", paymentSchema);

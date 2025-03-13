import mongoose from "mongoose";

const shippingSchema = new mongoose.Schema(
  {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    auction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auction",
      required: true,
      unique: true,
    },
    name: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    postalCode: { type: String, required: true },
    contactNumber: { type: String, required: true },
    isDefault: { type: Boolean, default: false }, // Buyer can set as default
  },
  { timestamps: true }
);

export default mongoose.model("Shipping", shippingSchema);

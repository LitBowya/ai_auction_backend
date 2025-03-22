import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    profileImage: { type: String },
    address: { type: String, required: true },
    verified: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
    otp: { type: String },
    otpExpires: { type: Date },
    isBanned: { type: Boolean, default: false },
    resetOtp: { type: String }, // OTP for password reset
    resetOtpExpires: { type: Date }, // OTP expiry time
  },
  { timestamps: true }
);

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", UserSchema);

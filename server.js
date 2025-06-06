import express from "express";
import xss from "xss-clean";
import cors from "cors";
import compression from "compression";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import connectDB from "./config/db.js";

// Import routes
import authRoutes from "./routes/authRoutes.js";
import auctionRoutes from "./routes/auctionRoutes.js";
import artworkRoutes from "./routes/artworkRoutes.js";
import bidRoutes from "./routes/bidRoutes.js";
import auditRoutes from "./routes/auditRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import shippingRoutes from "./routes/shippingRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";

import agenda from "./config/agenda.js";

// Import middleware
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";

dotenv.config();
connectDB();

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  // Add any other origins if needed
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, etc)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) === -1) {
        return callback(null, allowedOrigins[0]); // Default to frontend URL
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);
// Add Vary header for proper caching
app.use((req, res, next) => {
  res.header("Vary", "Origin");
  next();
});
app.use(cookieParser());
app.use(compression());
app.use(express.json({ limit: "100mb" }));
app.use(bodyParser.json({ limit: "100mb" }));
app.use(bodyParser.urlencoded({ limit: "100mb", extended: true }));
app.use(xss());

const limiter = rateLimit({
  windowMs: 100 * 60 * 1000, // 5 minutes
  max: 1000, // Limit each IP to 100 requests per window
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});
app.use(limiter);

app.get("/", (req, res) => {
  res.status(200).json({ success: true, message: "API is running!" });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/Artworks", artworkRoutes);
app.use("/api/Auctions", auctionRoutes);
app.use("/api/bids", bidRoutes);
app.use("/api/Audits", auditRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/Payments", paymentRoutes);
app.use("/api/shipping", shippingRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/Users", userRoutes);
app.use("/api/Orders", orderRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

process.on("SIGINT", async () => {
  console.log("Closing agenda gracefully...");
  await agenda.stop(); // Stops Agenda's background job processing
  console.log("Agenda stopped");
  process.exit(0); // Exit the process
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 My server is running on port ${PORT}`));

import { Worker } from "bullmq";
import Auction from "../models/Auction.js";
import { notifyHighestBidder } from "../utils/notification.js";
import { redisConfig } from "../config/bullConfig.js";

const startAuctionWorker = new Worker(
  "auctionStartQueue",
  async (job) => {
    const { auctionId } = job.data;

    const auction = await Auction.findById(auctionId);
    if (!auction) {
      console.log(`Auction ${auctionId} not found.`);
      return;
    }

    if (auction.status === "pending") {
      auction.status = "active";
      await auction.save();
      console.log(`Auction ${auctionId} is now ACTIVE.`);
    }
  },
  { connection: redisConfig }
);

const endAuctionWorker = new Worker(
  "auctionEndQueue",
  async (job) => {
    const { auctionId } = job.data;

    const auction = await Auction.findById(auctionId)
      .populate("highestBidder", "name email")
      .populate("artwork", "title");

    if (!auction) {
      console.log(`Auction ${auctionId} not found.`);
      return;
    }

    if (auction.status === "active") {
      auction.status = "completed";
      await auction.save();
      console.log(`Auction ${auctionId} is now COMPLETED.`);

      // Notify the highest bidder
      if (auction.highestBidder) {
        await notifyHighestBidder(auction);
      }
    }
  },
  { connection: redisConfig }
);

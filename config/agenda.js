// agenda.js
import { Agenda } from "agenda";
import mongoose from "mongoose";

// Create an Agenda instance
const agenda = new Agenda({
  db: {
    address: process.env.MONGO_URI,
    collection: "agendaJobs",
  },
  processEvery: "30 seconds",
});

// Define the auction start job
agenda.define("startAuction", async (job) => {
  const { auctionId } = job.attrs.data;

  try {
    // Update auction status to active
    await mongoose
      .model("Auction")
      .findByIdAndUpdate(auctionId, { status: "active" }, { new: true });
    console.log(`Auction ${auctionId} started successfully`);
  } catch (error) {
    console.error(`Error starting auction ${auctionId}:`, error);
  }
});

// Define the auction end job
agenda.define("endAuction", async (job) => {
  const { auctionId } = job.attrs.data;

  try {
    const auction = await mongoose.model("Auction").findById(auctionId);

    if (!auction) {
      console.error(`Auction ${auctionId} not found`);
      return;
    }

    auction.status = "completed";

    await auction.save();
    console.log(`Auction ${auctionId} ended successfully`);
  } catch (error) {
    console.error(`Error ending auction ${auctionId}:`, error);
  }
});

// Start Agenda
(async function () {
  await agenda.start();
  console.log("Agenda started");
})();

export default agenda;

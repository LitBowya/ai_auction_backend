import Notification from "../models/Notification.js";
import { sendEmail } from "../utils/email.js";

export const notifyHighestBidder = async (auction) => {
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
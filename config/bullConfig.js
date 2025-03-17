import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { config } from "dotenv";

// Load environment variables
config();

// Configure Upstash Redis for BullMQ
const redisConnection = new IORedis(process.env.UPSTASH_REDIS_URL, {
  password: process.env.UPSTASH_REDIS_TOKEN,
  maxRetriesPerRequest: null, // Fixes the BullMQ connection issue
  enableReadyCheck: false, 
});

// Auction Queues
export const auctionStartQueue = new Queue("auctionStartQueue", {
  connection: redisConnection,
});

export const auctionEndQueue = new Queue("auctionEndQueue", {
  connection: redisConnection,
});

export const redisConfig = redisConnection; // Export for Workers

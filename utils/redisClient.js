import { Redis } from "@upstash/redis";
import dotenv from "dotenv";

dotenv.config();

// Debug: Log environment variables before connecting
console.log(
  "[DEBUG] UPSTASH_REDIS_REST_URL:",
  process.env.UPSTASH_REDIS_REST_URL
);
console.log(
  "[DEBUG] UPSTASH_REDIS_REST_TOKEN:",
  process.env.UPSTASH_REDIS_REST_TOKEN
);

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Debugging logs
redis
  .set("test_key", "Connected to Upstash Redis!")
  .then(() => console.log("[DEBUG] ✅ Upstash Redis connection successful"))
  .catch((err) => console.error("[ERROR] ❌ Redis Connection Failed:", err));

export default redis;

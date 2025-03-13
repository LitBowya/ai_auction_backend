import { Redis } from "@upstash/redis";
import dotenv from "dotenv";

dotenv.config();


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

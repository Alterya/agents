import { ensureWorkers } from "./src/lib/queue/workers";

// Simple worker entry: require REDIS_URL and spin up handlers
if (!process.env.REDIS_URL) {
  console.error("REDIS_URL not set; worker will not start.");
  process.exit(1);
}

ensureWorkers();
console.log("BullMQ workers initialized. Waiting for jobs...");

// Keep the process alive
setInterval(() => {}, 1 << 30);

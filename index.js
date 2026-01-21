import cron from "node-cron";

console.log("🚀 Twitter Alpha Fetcher started");

// Simple health log every 5 minutes
cron.schedule("*/5 * * * *", () => {
  console.log("✅ Twitter Alpha Fetcher is running:", new Date().toISOString());
});

// Keep process alive
process.on("SIGTERM", () => {
  console.log("❌ Process terminated");
  process.exit(0);
});


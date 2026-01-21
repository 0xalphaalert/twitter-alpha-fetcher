import cron from "node-cron";
import { createClient } from "@supabase/supabase-js";

console.log("🚀 Twitter Alpha Fetcher started");

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ---- TEST INSERT (RUNS ON START) ----
async function testSupabaseInsert() {
  const { error } = await supabase
    .from("twitter_alpha")
    .insert({
      tweet_id: "railway_test_" + Date.now(),
      source_type: "global_search",
      source_account: "railway_test",
      category: "Airdrop",
      content: "Railway Supabase connection test",
      tweet_url: "https://x.com/test",
      tweeted_at: new Date().toISOString()
    });

  if (error) {
    console.error("❌ Supabase insert failed:", error.message);
  } else {
    console.log("✅ Supabase insert successful");
  }
}

// Run once on startup
testSupabaseInsert();

// ---- HEALTH LOG ----
cron.schedule("*/5 * * * *", () => {
  console.log("✅ Twitter Alpha Fetcher running:", new Date().toISOString());
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("❌ Process terminated");
  process.exit(0);
});

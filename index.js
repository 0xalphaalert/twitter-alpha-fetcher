import cron from "node-cron";
import { createClient } from "@supabase/supabase-js";
import { fetchAccountTweets } from "./fetchAccounts.js";

console.log("🚀 Twitter Alpha Fetcher started");

// ---- SUPABASE CLIENT ----
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase env vars missing");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ---- ONE-TIME INSERT TEST (SAFE TO KEEP FOR NOW) ----
async function testSupabaseInsert() {
  const { error } = await supabase.from("twitter_alpha").insert({
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



// ---- CLEANUP JOB (EVERY 6 HOURS) ----
cron.schedule("0 */6 * * *", async () => {
  console.log("🧹 Running cleanup job");

  const { error, count } = await supabase
    .from("twitter_alpha")
    .delete({ count: "exact" })
    .lt("created_at", new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString());

  if (error) {
    console.error("❌ Cleanup failed:", error.message);
  } else {
    console.log(`🗑️ Cleanup complete — deleted ${count ?? 0} rows`);
  }
});

// ---- HEALTH LOG (EVERY 5 MINUTES) ----
cron.schedule("*/5 * * * *", () => {
  console.log("✅ Twitter Alpha Fetcher running:", new Date().toISOString());
});

// ---- GRACEFUL SHUTDOWN ----
process.on("SIGTERM", () => {
  console.log("❌ Process terminated");
  process.exit(0);
});
// ---- FETCH ACCOUNT TIMELINES (EVERY 30 MINUTES) ----
cron.schedule("*/30 * * * *", async () => {
  console.log("⏰ Running account timeline fetch");
  await fetchAccountTweets(supabase);
});
// ---- KEEP PROCESS ALIVE ----
setInterval(() => {
  // This keeps the Node.js event loop active
}, 60 * 1000);


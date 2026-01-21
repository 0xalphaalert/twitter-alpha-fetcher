import Parser from "rss-parser";

const parser = new Parser();

// Accounts to fetch ALL tweets from
const ACCOUNTS = [
  "GalxeQuest",
  "Taskoncampaigns",
  "zelay_io"
];

// Fetch tweets from account timelines via Nitter RSS
export async function fetchAccountTweets(supabase) {
  console.log("📥 Fetching account timelines...");

  for (const account of ACCOUNTS) {
    try {
      const rssUrl = `https://nitter.net/${account}/rss`;
      const feed = await parser.parseURL(rssUrl);

      if (!feed?.items?.length) {
        console.log(`⚠️ No tweets found for ${account}`);
        continue;
      }

      for (const item of feed.items) {
        // Extract tweet ID from URL
        const match = item.link?.match(/status\/(\d+)/);
        if (!match) continue;

        const tweetId = match[1];

        // Extract image URLs (if any)
        const imageUrls = [];
        if (item.enclosure?.url) {
          imageUrls.push(item.enclosure.url);
        }

        // Insert into Supabase
        const { error } = await supabase.from("twitter_alpha").insert({
          tweet_id: tweetId,
          source_type: "account_feed",
          source_account: account,
          category: "Web3 Campaigns",
          content: item.contentSnippet || item.title || "",
          tweet_url: item.link,
          image_urls: imageUrls,
          tweeted_at: new Date(item.pubDate).toISOString()
        });

        if (error && !error.message.includes("duplicate")) {
          console.error(`❌ Insert failed (${account}):`, error.message);
        }
      }

      console.log(`✅ Finished fetching ${account}`);
    } catch (err) {
      console.error(`❌ Error fetching ${account}:`, err.message);
    }
  }
}


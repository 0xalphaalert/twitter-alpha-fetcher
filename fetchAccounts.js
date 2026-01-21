import { setTimeout as delay } from "timers/promises";

// Accounts to fetch
const ACCOUNTS = [
  "GalxeQuest",
  "Taskoncampaigns",
  "zelay_io"
];

// Nitter mirrors (rotated)
const MIRRORS = [
  "https://nitter.poast.org",
  "https://nitter.fdn.fr",
  "https://nitter.cz"
];

// Fetch HTML with mirror rotation
async function fetchWithMirrors(path) {
  for (const base of MIRRORS) {
    const url = `${base}${path}`;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0"
        },
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      return { html, base };
    } catch (err) {
      console.warn(`⚠️ Mirror failed ${base}: ${err.message}`);
      // small delay before next mirror
      await delay(500);
    }
  }
  throw new Error("All mirrors failed");
}

// Extract tweets from Nitter HTML
function parseTweets(html, base) {
  const tweets = [];
  const articleRegex = /<div class="tweet-content[^"]*">([\s\S]*?)<\/div>[\s\S]*?<a class="tweet-link" href="([^"]+)"/g;

  let match;
  while ((match = articleRegex.exec(html)) !== null) {
    const contentHtml = match[1];
    const linkPath = match[2];

    const idMatch = linkPath.match(/status\/(\d+)/);
    if (!idMatch) continue;

    const tweetId = idMatch[1];
    const tweetUrl = `${base}${linkPath}`;

    // Strip HTML tags for content
    const content = contentHtml
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .trim();

    // Extract images
    const imageUrls = [];
    const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
    let img;
    while ((img = imgRegex.exec(contentHtml)) !== null) {
      imageUrls.push(img[1]);
    }

    tweets.push({
      tweetId,
      tweetUrl,
      content,
      imageUrls
    });
  }

  return tweets;
}

export async function fetchAccountTweets(supabase) {
  console.log("📥 Fetching account timelines (HTML + mirror rotation)...");

  for (const account of ACCOUNTS) {
    try {
      const { html, base } = await fetchWithMirrors(`/${account}`);
      const tweets = parseTweets(html, base);

      if (!tweets.length) {
        console.log(`⚠️ No tweets parsed for ${account}`);
        continue;
      }

      let inserted = 0;

      for (const t of tweets) {
        const { error } = await supabase.from("twitter_alpha").insert({
          tweet_id: t.tweetId,
          source_type: "account_feed",
          source_account: account,
          category: "Web3 Campaigns",
          content: t.content || "",
          tweet_url: t.tweetUrl,
          image_urls: t.imageUrls,
          tweeted_at: new Date().toISOString()
        });

        if (!error) inserted++;
      }

      console.log(`✅ ${account}: parsed ${tweets.length}, inserted ${inserted}`);
    } catch (err) {
      console.error(`❌ ${account}: ${err.message}`);
    }
  }
}

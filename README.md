# Ad Scraper

Scrape and analyze high-performing ads from Meta Ads Library, TikTok, and Instagram. Built with Next.js, powered by Apify for scraping and Gemini for video analysis.

**Live App:** [https://ad-scraper-ops.vercel.app](https://ad-scraper-ops.vercel.app)

## Features

- **Multi-platform scraping** — Meta Ads Library, TikTok viral content, Instagram posts
- **Niche keyword search** — Find viral content by searching "AI automation", "ecommerce", etc.
- **Time period filtering** — Filter to last 48h, 7d, 30d, or 90d for fresh viral content
- **Advanced filters** — Filter by follower count, engagement rate, impressions range
- **Creator analytics** — Track engagement rate, view-to-follower ratio, top posts
- **AI video analysis** — Gemini watches videos and extracts hooks, scripts, visual breakdowns
- **Swipe file collections** — Save and organize winning ads
- **Team-friendly** — Web UI anyone can use, deployed on Vercel

## Usage (Production)

The app runs on Vercel at [ad-scraper-ops.vercel.app](https://ad-scraper-ops.vercel.app).

1. Go to `/scrape` to start a new scrape
2. Select platform (Meta, TikTok, or Instagram)
3. Enter search query (e.g., "AI automation", "dropshipping")
4. Set time period to find recent viral content
5. View results in `/ads` once complete

## Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for local testing.

## Environment Variables

```bash
# Apify (required for scraping)
APIFY_TOKEN=your_apify_token

# Gemini (required for video analysis)
GEMINI_API_KEY=your_gemini_key

# Turso Database (required - cloud SQLite)
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your_turso_token
```

### Getting API Keys

1. **Apify Token**: Sign up at [apify.com](https://apify.com), go to Settings → Integrations → API Token
2. **Gemini API Key**: Get from [Google AI Studio](https://aistudio.google.com/apikey)

## Usage

### Scraping Ads

1. Go to `/scrape`
2. Select platform (Meta, TikTok, or Instagram)
3. Choose search type:
   - **Meta**: Keyword search or Advertiser/Page ID
   - **TikTok/Instagram**: Search Query (recommended), Hashtag, or Profile
4. Enter your search query (e.g., "AI automation", "ecommerce tips")
5. Set time period filter (48h, 7d, 30d, 90d) to find recent viral content
6. Click "Start Scrape"

### Browsing Ads

1. Go to `/ads` to browse your scraped content
2. Filter by platform, media type, analysis status, or time period
3. Sort by views, likes, comments, shares, or days running
4. Click any ad to view details and run AI analysis

### Managing Jobs

1. Go to `/jobs` to see all scrape jobs
2. Jobs show status: Running, Completed, or Failed
3. Stuck jobs (running > 10 min) show orange warning
4. Click "Recover Stuck Jobs" to check and fix stuck jobs

### AI Analysis

Click "Analyze Ad" on any ad detail page to run Gemini video analysis. For video ads, Gemini will:

- Transcribe all audio with timestamps
- Extract the hook technique and why it works
- Break down scenes and visual elements
- Identify persuasion techniques (pain points, proof, CTAs)
- Generate a replication guide with script template and shot list

## Tech Stack

- **Framework**: Next.js 15 (App Router, Turbopack)
- **UI**: Tailwind CSS 4, shadcn/ui
- **Database**: Turso (cloud SQLite) + Drizzle ORM
- **Scraping**: Apify actors
  - Meta: `curious_coder/facebook-ads-library-scraper`
  - TikTok: `clockworks/tiktok-scraper`
  - Instagram: `apify/instagram-scraper`
- **AI Analysis**: Gemini 2.0 Flash
- **Deployment**: Vercel (production)

## Project Structure

```
ad-scraper/
├── src/
│   ├── app/                    # Next.js pages & API routes
│   │   ├── api/
│   │   │   ├── scrape/         # POST - start scrape
│   │   │   ├── jobs/           # GET - list jobs
│   │   │   │   └── recover/    # POST - recover stuck jobs
│   │   │   └── ads/            # GET - list, GET/POST - detail/analyze
│   │   ├── ads/                # Ad library & detail pages
│   │   ├── scrape/             # New scrape form
│   │   └── jobs/               # Job history with stuck detection
│   ├── components/
│   │   ├── ui/                 # shadcn components
│   │   ├── ads/                # Ad card, grid
│   │   ├── scrape/             # Scrape form
│   │   └── analysis/           # Analysis panel
│   └── lib/
│       ├── db/                 # Turso/Drizzle schema & client
│       ├── apify/              # Apify client & platform scrapers
│       │   ├── client.ts       # Base Apify client
│       │   ├── meta-scraper.ts
│       │   ├── tiktok-scraper.ts
│       │   └── instagram-scraper.ts
│       └── analysis/           # Gemini analyzer
└── .env.local                  # Your API keys (local only)
```

## Cost Estimates

| Component | Cost |
|-----------|------|
| Apify Starter Plan | $39/month |
| Meta scraping | ~$0.20 per 1,000 ads |
| TikTok scraping | ~$2 per 1,000 videos |
| Instagram scraping | ~$1.50 per 1,000 posts |
| Gemini API | ~$0.001 per video analysis |
| Turso Database | Free tier (500 DBs, 9GB) |
| Vercel | Free (hobby tier) |

**Example monthly usage:**
- 5,000 Meta ads: $1
- 2,000 TikTok videos: $4
- 2,000 Instagram posts: $3
- 500 video analyses: $0.50
- **Total: ~$47.50/month**

## Testing

**IMPORTANT: Tests run exclusively on the Vercel deployment.**

All e2e and integration tests must target the production URL:
```
https://ad-scraper-ops.vercel.app
```

Do NOT run tests against localhost. The Vercel deployment is the source of truth for testing.

### Running Tests

Use Playwright MCP to run browser-based tests:
1. Navigate to the Vercel deployment URL
2. Test page loads, navigation, form submissions
3. Validate API responses through the UI

## Roadmap

- [x] Meta Ads Library scraping
- [x] TikTok viral content scraping
- [x] Instagram viral content scraping
- [x] Niche keyword search (search queries)
- [x] Time period filtering (48h, 7d, 30d, 90d)
- [x] Engagement sorting (views, likes, comments, shares)
- [x] Gemini video analysis
- [x] Ad library with filters
- [x] Job recovery for stuck scrapes
- [x] Creator stats (engagement rate, view/follower ratio)
- [x] Advanced scrape filters (follower range, engagement %, impressions)
- [x] Creators page with stats and detail views
- [ ] Collections/swipe files
- [ ] Scheduled scraping
- [ ] Export to CSV/JSON

## Related

- [StorePro Ops](../) — Parent project
- [AI Content Pipeline](../ai-content-pipeline/) — Generate ads based on scraped inspiration
- [Design Doc](../docs/plans/2026-01-22-ad-scraper-design.md) — Full technical design

---

Built for StorePro Ops

# Ad Scraper

Scrape and analyze high-performing ads from Meta Ads Library and TikTok Creative Center. Built with Next.js, powered by Apify for scraping and Gemini for video analysis.

## Features

- **Multi-platform scraping** — Meta (Facebook/Instagram) and TikTok ads
- **Keyword & advertiser search** — Find ads by topic or track competitors
- **AI video analysis** — Gemini watches videos and extracts hooks, scripts, visual breakdowns
- **Swipe file collections** — Save and organize winning ads
- **Team-friendly** — Web UI anyone can use, deployed on Vercel

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start scraping.

## Environment Variables

```bash
# Apify (required for scraping)
APIFY_TOKEN=your_apify_token

# Gemini (required for video analysis)
GEMINI_API_KEY=your_gemini_key

# Database (optional, defaults to ./ads.db)
DATABASE_URL=./ads.db
```

### Getting API Keys

1. **Apify Token**: Sign up at [apify.com](https://apify.com), go to Settings → Integrations → API Token
2. **Gemini API Key**: Get from [Google AI Studio](https://aistudio.google.com/apikey)

## Usage

### Scraping Ads

1. Go to `/scrape`
2. Select platform (Meta or TikTok)
3. Enter keyword or advertiser ID
4. Configure filters (country, media type, max results)
5. Click "Start Scrape"

### Browsing Ads

1. Go to `/ads` to browse your scraped ads
2. Use filters to narrow down by platform, media type, or analysis status
3. Click any ad to view details and run AI analysis

### AI Analysis

Click "Analyze Ad" on any ad detail page to run Gemini video analysis. For video ads, Gemini will:

- Transcribe all audio with timestamps
- Extract the hook technique and why it works
- Break down scenes and visual elements
- Identify persuasion techniques (pain points, proof, CTAs)
- Generate a replication guide with script template and shot list

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: Tailwind CSS 4, shadcn/ui
- **Database**: SQLite + Drizzle ORM
- **Scraping**: Apify (Meta + TikTok scrapers)
- **AI Analysis**: Gemini 2.0 Flash
- **Deployment**: Vercel

## Project Structure

```
ad-scraper/
├── src/
│   ├── app/                    # Next.js pages & API routes
│   │   ├── api/
│   │   │   ├── scrape/         # POST - start scrape
│   │   │   ├── jobs/[id]/      # GET - job status
│   │   │   └── ads/            # GET - list, GET/POST - detail/analyze
│   │   ├── ads/                # Ad library & detail pages
│   │   ├── scrape/             # New scrape form
│   │   └── jobs/               # Job history
│   ├── components/
│   │   ├── ui/                 # shadcn components
│   │   ├── ads/                # Ad card, grid
│   │   ├── scrape/             # Scrape form
│   │   └── analysis/           # Analysis panel
│   └── lib/
│       ├── db/                 # SQLite schema & client
│       ├── apify/              # Apify client & scrapers
│       └── analysis/           # Gemini analyzer
├── ads.db                      # SQLite database (auto-created)
└── .env.local                  # Your API keys
```

## Cost Estimates

| Component | Cost |
|-----------|------|
| Apify Starter Plan | $39/month |
| Meta scraping | ~$0.20 per 1,000 ads |
| TikTok scraping | ~$2 per 1,000 ads |
| Gemini API | ~$0.001 per video analysis |
| Vercel | Free (hobby tier) |

**Example monthly usage:**
- 5,000 Meta ads: $1
- 1,000 TikTok ads: $2
- 500 video analyses: $0.50
- **Total: ~$42.50/month**

## Roadmap

- [x] Meta Ads Library scraping
- [x] TikTok Creative Center scraping
- [x] Gemini video analysis
- [x] Ad library with filters
- [ ] Collections/swipe files
- [ ] Advertiser tracking
- [ ] Scheduled scraping
- [ ] Export to CSV/JSON

## Related

- [StorePro Ops](../) — Parent project
- [AI Content Pipeline](../ai-content-pipeline/) — Generate ads based on scraped inspiration
- [Design Doc](../docs/plans/2026-01-22-ad-scraper-design.md) — Full technical design

---

Built for StorePro Ops

# Changelog

Track what's new and what's changed in Ad Scraper.

---

## January 2026

### January 25, 2026

**Ad Intelligence System**

Major new feature: AI-powered competitor analysis and winner detection.

- **Winner Detection** - Automatically identifies high-performing ads
  - Scores ads 0-100% based on longevity, engagement, scaling signals
  - Ads running 14+ days with strong signals flagged as winners
  - View all winners at `/intelligence/winners`

- **Spend Estimation** - Estimate competitor ad budgets
  - Calculates daily and total spend from run duration
  - Uses niche-specific CPM benchmarks (ecommerce, SaaS, finance, etc.)
  - Detects scaling signals (high impressions, long run time)

- **Audience Inference** - AI analyzes creatives to infer targeting
  - Uses Gemini Vision to analyze images/videos
  - Infers demographics (age, gender, income)
  - Suggests Facebook interests and lookalike sources

- **Competitor Tracking** - Monitor specific advertisers
  - Add competitors by page name
  - Track their total ads, active ads, and winners
  - View estimated total spend per competitor

- **Bulk Analysis** - Process multiple ads at once
  - Run spend estimation on all ads
  - Evaluate winner status for entire library
  - One-click from Intelligence dashboard

New pages:
- `/intelligence` - Dashboard with stats and quick links
- `/intelligence/winners` - Grid of all winner ads
- `/intelligence/competitors` - Competitor list and monitoring
- `/intelligence/competitors/[id]` - Single competitor deep dive

New API endpoints:
- `POST /api/intelligence/bulk-analyze`
- `GET /api/intelligence/winners`
- `POST /api/ads/[id]/estimate-spend`
- `POST /api/ads/[id]/evaluate-winner`
- `POST /api/ads/[id]/infer-audience`
- `GET/POST /api/competitors`
- `GET/PATCH/DELETE /api/competitors/[id]`
- `GET /api/competitors/[id]/ads`

---

### January 24, 2026

**Bug Fixes & Reliability Improvements**

- **Increased scrape timeout** from 5 minutes to 15 minutes
  - Large scrapes (100+ items) now complete reliably
  - Reduces "timeout" failures significantly

- **Added retry functionality** for failed jobs
  - New endpoint: `POST /api/jobs/{id}/retry`
  - Re-process results when Apify completed but database save failed
  - Data available for retry up to 7 days after scrape

- **Fixed database race condition**
  - Multiple concurrent scrapes no longer cause initialization errors
  - Added mutex pattern for reliable startup

- **Improved error messages**
  - Failed jobs now show specific error details
  - Recovery provides retry instructions
  - Processing stats tracked (ads inserted, skipped, duplicates)

- **Better null handling**
  - Fixed empty advertiser IDs causing database errors
  - TikTok, Instagram, and Meta scrapers now properly validate data

**New Features**

- **Documentation section** added to the app
  - User-friendly guides for non-technical team members
  - Platform comparison and scraping tips
  - Troubleshooting guide with common issues
  - API reference for developers

---

## December 2025

### Initial Release

- TikTok scraping via Clockworks actor
- Instagram scraping via Apify actor
- Meta Ads Library scraping via Curious Coder actor
- Ad library with filtering and search
- Creator tracking
- Basic AI analysis (placeholder)
- Video generation integration (TopView, Higgsfield)

---

## Coming Soon

- **Batch retry** - Retry multiple failed jobs at once
- **Scheduled scrapes** - Set up recurring scrapes
- **Collections** - Save ads to custom collections
- **Export** - Download ads as CSV/PDF
- **Alerts** - Get notified when competitors launch new campaigns

# Changelog

Track what's new and what's changed in Ad Scraper.

---

## January 2026

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
- **AI Analysis** - Automatic creative breakdown
- **Alerts** - Get notified when competitors run new ads

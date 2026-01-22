# Ad Scraper Research Findings

Research conducted: 2026-01-22

## Meta Ads Library Options

### Official Meta API
- **Access**: Free, requires Facebook app approval
- **Limitations**: 
  - Only works for EU ads OR political/social cause ads
  - Doesn't return ad assets (images/videos), advertiser info
  - ~1,500 results limit per query (cursor becomes too big for GET)
- **Documentation**: [Meta Ad Library API](https://www.facebook.com/ads/library/api/)
- **GitHub Scripts**: [facebook-research/Ad-Library-API-Script-Repository](https://github.com/facebookresearch/Ad-Library-API-Script-Repository)

### Apify Scrapers (Recommended)
- **Cost**: ~$0.20 per 1,000 ads
- **Best Options**:
  1. [Facebook Ads Library Scraper by curious_coder](https://apify.com/curious_coder/facebook-ads-library-scraper) - Extracts all ads including images, videos, captions, CTAs, metadata
  2. [Cheerio-based Scraper](https://apify.com/memo23/facebook-ads-library-scraper-cheerio) - Ultra-fast, no browser needed
  3. [Official Apify Facebook Ads Scraper](https://apify.com/apify/facebook-ads-scraper) - Most maintained
- **Advantages**:
  - No Meta app approval needed
  - Global access (not just EU)
  - Handles proxies, CAPTCHAs, anti-bot measures
  - Returns full ad assets
  - ~5-10 ads/second performance

### Stevesie
- **URL**: [stevesie.com/apps/facebook-ads-library-api](https://stevesie.com/apps/facebook-ads-library-api)
- **Approach**: Uses official API
- **Limitations**: Same as official API (EU + political only)

---

## TikTok Creative Center Options

### Official Commercial Content API
- **Access**: Requires application and approval from TikTok
- **Limitations**:
  - 600 requests per day maximum
  - Only EU ads accessible (no Asia, Middle East, etc.)
  - Strict approval process
- **Documentation**: [TikTok Commercial Content API](https://developers.tiktok.com/doc/commercial-content-api-get-ad-details)

### Apify Scrapers (Recommended)
- **Cost**: ~$0.10 per page (50 results) = ~$2 per 1,000 ads
- **Best Options**:
  1. [TikTok Creative Center Top Ads Scraper](https://apify.com/codebyte/tiktok-creative-center-top-ads) - Top ads, trending videos, creators, songs, hashtags
  2. [TikTok Creative Center Scraper](https://apify.com/doliz/tiktok-creative-center-scraper) - All-in-one scraper
  3. [TikTok Ads Scraper](https://apify.com/lexis-solutions/tiktok-ads-scraper) - Ad creatives, engagement, metadata, landing pages
- **Advantages**:
  - Global access (not just EU)
  - No approval needed
  - Structured JSON output
  - Handles TikTok's anti-scraping measures

### Anti-Scraping Notes
TikTok employs advanced security: encrypted headers, behavioral detection, real-time fraud scoring. DIY scraping is difficult. Apify handles this.

---

## Third-Party Ad Spy Tools

| Tool | Platforms | API Access | Cost | Notes |
|------|-----------|------------|------|-------|
| **BigSpy** | 9 platforms (FB, IG, TikTok, YT, etc.) | Enterprise only | $9/mo basic, $2000+/mo for API | 1B+ ads, 500K new daily |
| **AdSpy** | Facebook, Instagram only | No API | $149/mo | 164M+ ads, deepest Meta coverage |
| **SpyFu** | Google Ads, SEO | Yes (Pro plan) | $58/mo | Not for social ads |
| **PowerAdSpy** | FB, IG, Google | Unknown | ~$49/mo | Multi-platform |
| **Minea** | FB, IG, TikTok, Pinterest | Unknown | $49/mo | Dropshipping focused |

**Verdict**: None offer affordable API access for our use case.

---

## Recommended Approach

**Use Apify as the scraping backend**

### Why Apify Wins
1. **Pure HTTP API** - Works on Vercel serverless (no browser needed)
2. **Pay-per-use** - Only pay for what you scrape
3. **Maintained** - Specialists handle anti-bot measures
4. **Both platforms** - Meta + TikTok scrapers available
5. **Reliable** - Battle-tested infrastructure

### Cost Estimates
| Volume | Meta Cost | TikTok Cost | Total |
|--------|-----------|-------------|-------|
| 1,000 ads | $0.20 | $2.00 | $2.20 |
| 10,000 ads | $2.00 | $20.00 | $22.00 |
| 100,000 ads | $20.00 | $200.00 | $220.00 |

Plus Apify platform fee: $39/mo (Starter) or $199/mo (Scale)

### Architecture
```
Next.js App (Vercel)
    ↓ HTTP API calls
Apify Actors (Meta + TikTok scrapers)
    ↓ JSON responses
SQLite/Supabase Database
    ↓
Web UI (browse, filter, analyze)
```

---

## Sources

- [Apify Pricing](https://apify.com/pricing)
- [Meta Ad Library API Guide](https://admanage.ai/blog/facebook-ads-library-api)
- [TikTok Commercial Content API](https://developers.tiktok.com/products/commercial-content-api)
- [How to Scrape TikTok 2026](https://scrapfly.io/blog/posts/how-to-scrape-tiktok-python-json)
- [Best Ad Spy Tools 2026](https://www.trendtrack.io/blog-post/best-adspy-tool)

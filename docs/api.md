# API Reference

This page is for developers. For the user guide, see [Scraping Guide](./scraping.md).

---

## Endpoints Overview

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/scrape` | POST | Start a new scrape |
| `/api/jobs` | GET | List all scrape jobs |
| `/api/jobs/[id]` | GET | Get job status |
| `/api/jobs/[id]/retry` | POST | Retry a failed job |
| `/api/jobs/recover` | POST | Recover stuck jobs |
| `/api/ads` | GET | Query scraped ads |
| `/api/ads/[id]` | GET | Get single ad details |
| `/api/ads/[id]/estimate-spend` | POST/GET | Estimate ad spend |
| `/api/ads/[id]/evaluate-winner` | POST/GET | Evaluate winner status |
| `/api/ads/[id]/infer-audience` | POST/GET | AI audience inference |
| `/api/intelligence/winners` | GET | List winner ads |
| `/api/intelligence/bulk-analyze` | POST | Bulk analyze ads |
| `/api/competitors` | GET/POST | List/add competitors |
| `/api/competitors/[id]` | GET/PATCH/DELETE | Manage competitor |
| `/api/competitors/[id]/ads` | GET | Get competitor's ads |
| `/api/creators` | GET | List creators/advertisers |

For detailed intelligence API documentation, see [Ad Intelligence](./intelligence.md).

---

## Start a Scrape

```
POST /api/scrape
```

### Request Body

```json
{
  "platform": "tiktok" | "instagram" | "meta",
  "searchType": "keyword" | "hashtag" | "profile",
  "query": "your search term",
  "filters": {
    "timePeriod": "48h" | "7d" | "30d" | "90d",
    "maxItems": 50,
    "minFollowers": 10000,
    "maxFollowers": 100000,
    "minEngagementRate": 2.5,
    "minLikes": 1000,
    "minViews": 10000,
    "minImpressions": 1000,
    "maxImpressions": 1000000,
    "country": "US",
    "mediaType": "ALL" | "IMAGE" | "VIDEO",
    "activeOnly": true,
    "sortBy": "popular" | "latest" | "oldest"
  }
}
```

### Platform-Specific Filters

| Filter | TikTok | Instagram | Meta |
|--------|--------|-----------|------|
| `timePeriod` | Yes | Yes | No |
| `minFollowers` | Yes | No | No |
| `maxFollowers` | Yes | No | No |
| `minEngagementRate` | No | Yes | No |
| `minLikes` | No | Yes | No |
| `minViews` | No | Yes | No |
| `minImpressions` | No | No | Yes |
| `maxImpressions` | No | No | Yes |
| `country` | No | No | Yes |
| `mediaType` | No | No | Yes |
| `activeOnly` | No | No | Yes |
| `sortBy` | Yes | No | No |

### Response

```json
{
  "jobId": "abc123",
  "status": "running",
  "message": "Scrape started. Poll /api/jobs/{jobId} for status."
}
```

---

## Get Job Status

```
GET /api/jobs/[id]
```

### Response

```json
{
  "id": "abc123",
  "platform": "tiktok",
  "searchType": "keyword",
  "query": "AI automation",
  "status": "completed" | "running" | "pending" | "failed",
  "adsFound": 47,
  "startedAt": "2024-01-15T10:30:00.000Z",
  "completedAt": "2024-01-15T10:35:00.000Z",
  "error": null
}
```

---

## Retry Failed Job

```
POST /api/jobs/[id]/retry
```

Re-processes results from a failed job. Only works if:
- Apify run completed successfully (status = SUCCEEDED)
- Data is still available (within 7 days)

### Response

```json
{
  "success": true,
  "jobId": "abc123",
  "stats": {
    "advertisersProcessed": 15,
    "advertisersSkipped": 2,
    "adsInserted": 47,
    "adsSkipped": 3,
    "errorCount": 2
  },
  "errors": ["Ad xyz: duplicate entry", "..."]
}
```

---

## Recover Stuck Jobs

```
POST /api/jobs/recover
```

Checks all jobs that have been "running" for more than 10 minutes and updates their status based on actual Apify run status.

### Response

```json
{
  "message": "Checked 3 stuck jobs",
  "recovered": 2,
  "stillRunning": 1,
  "recoveredIds": ["job1", "job2"],
  "stillRunningIds": ["job3"]
}
```

---

## Query Ads

```
GET /api/ads
```

### Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| `platform` | string | Filter by platform |
| `mediaType` | string | Filter by media type |
| `search` | string | Search in headline/body |
| `timePeriod` | string | 7d, 30d, 90d, all |
| `minDaysRunning` | number | Min days ad has been running |
| `maxDaysRunning` | number | Max days ad has been running |
| `limit` | number | Results per page (default: 20) |
| `offset` | number | Pagination offset |

### Response

```json
{
  "ads": [
    {
      "id": "abc123",
      "platform": "tiktok",
      "advertiserId": "user123",
      "advertiserName": "Creator Name",
      "externalId": "video123",
      "headline": "Check this out!",
      "bodyText": "Amazing content...",
      "ctaText": "Learn More",
      "landingUrl": "https://example.com",
      "mediaType": "video",
      "mediaUrls": "[\"https://...\"]",
      "thumbnailUrl": "https://...",
      "impressionsMin": 50000,
      "impressionsMax": 100000,
      "likes": 5000,
      "comments": 200,
      "shares": 100,
      "daysRunning": 7,
      "scrapedAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "total": 150,
  "limit": 20,
  "offset": 0
}
```

---

## Apify Actors Used

| Platform | Actor ID | Documentation |
|----------|----------|---------------|
| TikTok | `clockworks/tiktok-scraper` | [Link](https://apify.com/clockworks/tiktok-scraper) |
| Instagram | `apify/instagram-scraper` | [Link](https://apify.com/apify/instagram-scraper) |
| Meta | `curious_coder/facebook-ads-library-scraper` | [Link](https://apify.com/curious_coder/facebook-ads-library-scraper) |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `APIFY_TOKEN` | Yes | Apify API token |
| `TURSO_DATABASE_URL` | Yes | Turso database URL |
| `TURSO_AUTH_TOKEN` | Yes | Turso auth token |

---

## Error Handling

All endpoints return errors in this format:

```json
{
  "error": "Error message here"
}
```

Common HTTP status codes:
- `400` - Bad request (invalid parameters)
- `404` - Not found
- `500` - Server error

---

## Rate Limits

- No explicit rate limits on the API
- Apify has its own rate limits based on your plan
- Recommended: Max 3 concurrent scrapes

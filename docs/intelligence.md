# Ad Intelligence

The Intelligence module provides AI-powered competitor analysis, spend estimation, and winner detection for your scraped ads.

## Features

### Winner Detection

Automatically identifies high-performing ads based on:

- **Longevity** - Ads running 14+ days are likely profitable
- **Scaling signals** - High engagement, impressions, professional production
- **Activity** - Still running in the last 7 days

Each ad gets a **Winner Score** (0-100%) and is classified into tiers:

| Tier | Score | Meaning |
|------|-------|---------|
| Proven Winner | 80%+ | Established evergreen ad worth studying |
| Likely Winner | 60-79% | Strong performance signals |
| Potential | 40-59% | Showing promise, monitor it |
| Testing | 20-39% | Still in testing phase |
| Weak | <20% | Likely not performing well |

### Spend Estimation

Estimates how much competitors are spending on each ad based on:

- **Days running** - Longer = more spend
- **Niche CPM benchmarks** - Different niches have different costs
- **Scaling signals** - More variants, longer run = higher budget

Example output:
```
Daily Spend: $150-300
Total Spend: $2,250-4,500
Confidence: high
```

**CPM Benchmarks by Niche:**

| Niche | Low | Median | High |
|-------|-----|--------|------|
| E-commerce | $8 | $12 | $18 |
| SaaS | $15 | $22 | $35 |
| Finance | $20 | $30 | $50 |
| Crypto | $25 | $40 | $60 |
| Health | $12 | $18 | $28 |
| MMO | $8 | $14 | $22 |

### Audience Inference

Uses **Gemini Vision AI** to analyze ad creatives and infer target audience:

- **Demographics** - Age range, gender, income level
- **Psychographics** - Interests, pain points, desires
- **Targeting suggestions** - Facebook interests, lookalike sources

This is an expensive operation (uses AI API calls), so it's opt-in per ad.

### Competitor Tracking

Monitor specific advertisers over time:

- Track their total ads and active ads
- See when they launch new campaigns
- View their top-performing ads
- Estimate their total ad spend

---

## How to Use

### 1. Run Bulk Analysis

Go to **Intelligence** in the navigation and click **"Run Bulk Analysis"**.

This will:
- Estimate spend for all ads
- Evaluate winner status for all ads
- Take about 30 seconds for 100 ads

### 2. View Winners

Go to **Intelligence → Winners** to see all ads with winner scores above 60%.

Use filters to:
- Filter by platform (Meta, TikTok, Instagram)
- Adjust minimum winner score threshold

### 3. Track Competitors

Go to **Intelligence → Competitors** to:

1. Click **"+ Add Competitor"**
2. Select platform and enter page name
3. View their stats and ads

To see a competitor's ads with intelligence data, click **"View Ads"**.

### 4. Infer Audience (Optional)

For individual ads, you can run audience inference:

1. Go to an ad's detail page
2. Click **"Infer Audience"**
3. Wait for Gemini to analyze the creative
4. View inferred targeting data

---

## API Reference

### Run Bulk Analysis

```
POST /api/intelligence/bulk-analyze
```

**Request:**
```json
{
  "estimateSpend": true,
  "evaluateWinners": true,
  "inferAudience": false,
  "limit": 100,
  "platform": "meta"
}
```

**Response:**
```json
{
  "message": "Bulk analysis complete",
  "results": {
    "spendEstimates": { "processed": 95, "errors": 5 },
    "winnerEvaluations": { "processed": 100, "errors": 0, "winnersFound": 12 }
  },
  "adsProcessed": 100
}
```

### Get Winners

```
GET /api/intelligence/winners?platform=meta&minScore=0.6&limit=50
```

**Response:**
```json
{
  "winners": [
    {
      "ad": { "id": "...", "headline": "...", "thumbnailUrl": "..." },
      "advertiser": { "name": "...", "username": "..." },
      "winnerStatus": {
        "isWinner": true,
        "winnerScore": 0.85,
        "criteriaMet": { "longevity": true, "scaling": true, "engagement": true }
      }
    }
  ],
  "total": 12
}
```

### Estimate Spend for Single Ad

```
POST /api/ads/{id}/estimate-spend
```

**Request (optional):**
```json
{
  "niche": "ecommerce"
}
```

**Response:**
```json
{
  "estimate": {
    "daysRunning": 21,
    "dailySpend": { "min": 120, "max": 360 },
    "totalSpend": { "min": 2520, "max": 7560 },
    "isScaling": true,
    "scalingSignals": [...],
    "niche": "ecommerce",
    "confidence": "high"
  }
}
```

### Evaluate Winner Status for Single Ad

```
POST /api/ads/{id}/evaluate-winner
```

**Response:**
```json
{
  "evaluation": {
    "isWinner": true,
    "winnerScore": 0.78,
    "tier": "likely_winner",
    "criteria": [
      { "name": "longevity", "met": true, "weight": 0.35, "reason": "Running 21 days" },
      { "name": "scaling", "met": true, "weight": 0.25, "reason": "High scaling score" }
    ],
    "recommendation": "Likely winner - strong performance signals. Worth adding to swipe file."
  }
}
```

### Infer Audience for Single Ad

```
POST /api/ads/{id}/infer-audience
```

**Response:**
```json
{
  "inference": {
    "demographics": {
      "age_min": 25,
      "age_max": 45,
      "gender": "male",
      "income_level": "middle"
    },
    "psychographics": {
      "interests": ["entrepreneurship", "ecommerce", "side hustle"],
      "pain_points": ["9-5 job", "not enough income"],
      "desires": ["financial freedom", "work from home"]
    },
    "targeting": {
      "niche": "ecommerce",
      "buyer_type": "impulse",
      "likely_facebook_interests": ["Shopify", "Dropshipping", "Online Business"]
    },
    "confidence": { "overall": 0.85 }
  }
}
```

### Manage Competitors

**List Competitors:**
```
GET /api/competitors
```

**Add Competitor:**
```
POST /api/competitors
{
  "platform": "meta",
  "pageName": "DropshipKing",
  "pageUrl": "https://facebook.com/dropshipking"
}
```

**Get Competitor Details:**
```
GET /api/competitors/{id}
```

**Get Competitor's Ads with Intelligence:**
```
GET /api/competitors/{id}/ads?limit=50
```

**Remove Competitor:**
```
DELETE /api/competitors/{id}
```

---

## Best Practices

### Finding Winners

1. **Run bulk analysis weekly** after scraping new ads
2. **Focus on 60%+ winners** - these have proven signals
3. **Study longevity** - ads running 30+ days are evergreen
4. **Check scaling signals** - high impressions + long run = scaling

### Studying Winners

When you find a winner ad:

1. **Analyze the hook** - First 3 seconds matter most
2. **Note the format** - UGC? Talking head? Screen recording?
3. **Study the offer** - What's the CTA? What's promised?
4. **Check the landing page** - How do they convert?

### Competitor Research

1. **Add 5-10 competitors** in your niche
2. **Check weekly** for new campaigns
3. **Focus on their winners** - sort by winner score
4. **Track their spend** - see who's scaling

---

## Technical Notes

### Data Storage

Intelligence data is stored in these tables:

| Table | Purpose |
|-------|---------|
| `ad_snapshots` | Daily metrics snapshots |
| `audience_inference` | AI-inferred targeting |
| `spend_estimates` | Budget estimates |
| `tracked_competitors` | Competitor monitoring |
| `ad_winner_status` | Winner scores and criteria |

### Rate Limits

- **Spend estimation** - No limits (local calculation)
- **Winner detection** - No limits (local calculation)
- **Audience inference** - Uses Gemini API (has rate limits)
- **Bulk analysis** - Processes up to 100 ads at a time

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | For audience inference | Google Gemini API key |

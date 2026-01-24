# Troubleshooting

## Common Issues

### Scrape Stuck on "Running"

**Symptoms:** Job shows "Running" for more than 15 minutes

**Causes:**
- Large scrape taking longer than expected
- Apify service temporarily slow
- Processing error

**Solutions:**
1. **Wait a bit longer** - Large scrapes can take up to 15 minutes
2. **Check Scrape Jobs** - Go to Scrape Jobs page to see current status
3. **Trigger Recovery** - The system auto-recovers stuck jobs every 10 minutes

---

### Scrape Failed with "Result Processing Failed"

**Symptoms:** Error says "Apify completed but result processing failed"

**What Happened:** The scraper got the data, but saving it to the database failed.

**Good News:** Your data is still available for 7 days!

**Solution - Retry the Job:**
1. Go to **Scrape Jobs**
2. Find the failed job
3. Note the Job ID
4. Retry via API: `POST /api/jobs/{jobId}/retry`

Or ask a developer to run:
```bash
curl -X POST https://ad-scraper-ops.vercel.app/api/jobs/YOUR_JOB_ID/retry
```

---

### Scrape Failed with "Timeout"

**Symptoms:** Error says "Scrape timeout"

**Cause:** The scrape took longer than 15 minutes to complete.

**Solutions:**
1. **Reduce items** - Try scraping fewer items (50 instead of 100)
2. **Narrow your search** - More specific searches run faster
3. **Retry later** - Apify might be under heavy load

---

### No Results Found

**Symptoms:** Scrape completed but 0 ads found

**Causes:**
- Search term too specific
- No content matches filters
- Platform has limited data for that search

**Solutions:**
1. **Broaden your search** - Try more general keywords
2. **Remove filters** - Time period or engagement filters might be too strict
3. **Try different platform** - Some content exists on one platform but not another

---

### Scrape Failed Immediately

**Symptoms:** Job fails within seconds of starting

**Causes:**
- Invalid search term
- Apify service issue
- API key problem

**Solutions:**
1. **Check your search** - Make sure it's not empty or invalid
2. **Try again** - Might be a temporary issue
3. **Contact admin** - API key might need refresh

---

## Getting Help

### Check Job Status

1. Go to **Scrape Jobs** in the navigation
2. Find your job in the list
3. Check the status and any error message

### Understanding Error Messages

| Error Message | Meaning | What to Do |
|--------------|---------|------------|
| "Apify completed but result processing failed" | Data was scraped but not saved | Retry the job |
| "Scrape timeout" | Took too long | Reduce items, retry |
| "Apify run failed" | Scraper had an error | Retry with different search |
| "No Apify run ID" | Job didn't start properly | Start a new scrape |
| "Partial success: X/Y ads" | Some items failed | Check library, data is saved |

### Still Having Issues?

1. **Note your Job ID** - Found in Scrape Jobs page
2. **Screenshot the error** - Helps with debugging
3. **Contact the team** - Share the Job ID and error message

---

## System Status

### Current Limits

| Resource | Limit |
|----------|-------|
| Scrape timeout | 15 minutes |
| Max items per scrape | 200 |
| Data retention (Apify) | 7 days |
| Concurrent scrapes | 3 |

### Service Dependencies

The scraper relies on these external services:

| Service | Purpose | Status Check |
|---------|---------|--------------|
| **Apify** | Runs the actual scraping | [status.apify.com](https://status.apify.com) |
| **Turso** | Database storage | Check if jobs page loads |
| **Vercel** | Hosts the app | Check if site loads |

---

## FAQ

**Q: How long until my scrape completes?**
A: Usually 2-10 minutes. Large scrapes (100+ items) can take up to 15 minutes.

**Q: Why did my scrape find fewer items than expected?**
A: Filters (time period, engagement, etc.) reduce results. Also, the platform might not have that many matching items.

**Q: Can I cancel a running scrape?**
A: Not currently. Just wait for it to complete or timeout.

**Q: How often can I scrape?**
A: No strict limit, but avoid running more than 3 concurrent scrapes.

**Q: Do scraped results expire?**
A: The data in your library stays forever. Raw Apify data expires after 7 days (only matters for retrying failed jobs).

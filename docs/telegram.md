# Telegram Automation

## What is Telegram Automation?

Telegram Automation is a member acquisition system that uses the **mother-slave funnel** method. It scrapes members from target groups in your niche and funnels them to your protected community.

**Key Stats:**
- Cost: ~$0.01 per lead at scale
- Capacity: 10,000-50,000 members/month
- Account pool: 20-30 rotating accounts

---

## How the Funnel Works

```
TARGET GROUPS (AI, MMO, Ecom niches)
         |
         | Scrape members from public groups
         v
    SLAVE GROUPS (disposable buffer)
         |
         | Welcome message redirects them
         v
    MOTHER GROUP (your protected community)
         |
         v
    Your funnels ($99 offers, calls)
```

### Why This Architecture?

| Component | Purpose | Benefit |
|-----------|---------|---------|
| **Target Groups** | Source of leads | Find people interested in your niche |
| **Slave Groups** | Buffer layer | If banned, create a new one in 5 min |
| **Mother Group** | Main community | Never has bot activity, stays safe |
| **Account Pool** | Rotating accounts | One ban doesn't kill the system |

---

## Getting Started

### Step 1: Get Telegram API Credentials

1. Go to [my.telegram.org](https://my.telegram.org)
2. Log in with your phone number
3. Click "API development tools"
4. Create a new application
5. Save your **API ID** and **API Hash**

### Step 2: Add Accounts to Your Pool

Run the account setup wizard:

```bash
cd telegram-automation
npm run add-account
```

You'll need:
- Phone number (with access to SMS)
- Your API ID and API Hash
- (Optional) SOCKS5 proxy for the account

**Recommended:** Add 20-30 accounts for safe scaling.

### Step 3: Set Up Your Mother Group

Create your protected community:

```bash
npm run setup-mother
```

This configures where all your leads ultimately go.

### Step 4: Create Slave Groups

Create 3-5 slave groups per niche:

```bash
npm run create-slave
```

Choose a niche (AI, MMO, or Ecom) and the system will:
- Create a group with niche-appropriate title
- Set up a welcome message with mother group link
- Connect it to your funnel

---

## Running Campaigns

### Full Campaign (Recommended)

Runs the complete cycle: scrape, add, and report

```bash
npm run campaign
```

### Individual Steps

| Command | What It Does |
|---------|--------------|
| `npm run campaign:scrape` | Find target groups and extract members |
| `npm run campaign:scrape ai` | Scrape only AI niche groups |
| `npm run campaign:add` | Add queued members to slave groups |
| `npm run report` | Generate daily stats report |

### Daemon Mode (Automated)

Run continuously with scheduled operations:

```bash
npm run campaign:daemon
```

**Schedule:**
- Health check: Every 5 minutes
- Adding cycle: Hourly (8am-10pm)
- Daily report: 10pm
- Counter reset: Midnight

---

## Understanding Account Health

### Health Score

| Score | Status | What It Means |
|-------|--------|---------------|
| 80-100 | Healthy | Good to go |
| 50-79 | Caution | Slow down activity |
| 20-49 | At Risk | Reduce usage |
| 0-19 | Cooldown | Auto-paused for 48h |

### Account Status

| Status | Meaning |
|--------|---------|
| **Warming** | New account (14-day warmup period) |
| **Active** | Ready for adding members |
| **Cooldown** | Temporarily paused (48h) |
| **Banned** | Account is restricted |
| **Retired** | Permanently removed from pool |

---

## Rate Limits & Safety

### Daily Limits Per Account

| Action | Limit | Delay Between |
|--------|-------|---------------|
| Member adds | 50/day | 45 seconds |
| Group joins | 10/day | 60 seconds |
| Messages | 30/day | Variable |

### Scaling Examples

| Accounts | Daily Adds | Monthly Capacity | Est. Cost |
|----------|------------|------------------|-----------|
| 10 | 500 | 15,000 | ~$50 |
| 20 | 1,000 | 30,000 | ~$90 |
| 30 | 1,500 | 45,000 | ~$115 |

---

## Niche Configuration

### Search Keywords by Niche

| Niche | Keywords Searched |
|-------|-------------------|
| **AI** | AI tools, ChatGPT, AI business, automation, AI money |
| **MMO** | passive income, side hustle, make money online, online business |
| **Ecom** | dropshipping, Shopify, Amazon FBA, ecommerce |

### Slave Group Titles

| Niche | Example Titles |
|-------|----------------|
| **AI** | "AI Wealth Hub", "AI Automation Pro", "AI Business Secrets" |
| **MMO** | "Cash Flow Crew", "Income Insiders", "Wealth Builders" |
| **Ecom** | "Ecom Insiders", "Dropship Elite", "Seller Success" |

---

## Troubleshooting

### Common Errors

| Error | What It Means | Solution |
|-------|---------------|----------|
| `FLOOD_WAIT_X` | Rate limited by Telegram | Account auto-pauses, wait X seconds |
| `PEER_FLOOD` | Serious rate limit | Account goes to 48h cooldown |
| `USER_PRIVACY_RESTRICTED` | User blocked adds | Skipped automatically |
| `USER_BANNED_IN_CHANNEL` | User is banned | Added to blacklist |
| `CHAT_ADMIN_REQUIRED` | Slave needs admin | Give account admin rights |

### Account Gets Banned

1. Don't panic - other accounts keep working
2. Remove the banned account: Update accounts.json status to "banned"
3. Add a replacement account: `npm run add-account`
4. Let it warm up for 14 days before heavy usage

### Slave Group Gets Banned

1. Create a new slave: `npm run create-slave`
2. Members already in mother group are safe
3. Old slave members can't be re-added (blacklisted)

---

## Best Practices

### For Maximum Safety

1. **Start slow** - Begin with 10 accounts, scale up gradually
2. **Respect warmup** - New accounts need 14 days before full activity
3. **Monitor health** - Check daily reports, pause low-health accounts
4. **Use proxies** - Different IP per account reduces ban risk
5. **Rotate accounts** - Don't hammer one account

### For Best Results

1. **Target active groups** - Look for groups with recent messages
2. **Match niches** - AI leads go to AI slaves, then to AI mother group
3. **Quality welcome messages** - Make them feel natural, not spammy
4. **Track conversions** - Monitor how many reach mother group

### For Long-Term Success

1. **Replace accounts monthly** - Budget for 10-20% account loss
2. **Keep slave inventory** - Always have backup slaves ready
3. **Clean your lists** - Blacklist unresponsive members
4. **Review reports** - Weekly check on conversion rates

---

## Data Files

The system stores data in JSON files:

| File | Contents |
|------|----------|
| `accounts.json` | Your account pool with health scores |
| `slaves.json` | Slave group configurations |
| `mother.json` | Mother group settings |
| `members.json` | Scraped members queue |
| `processed.json` | Members already added |
| `blacklist.json` | Members to never contact |
| `daily-stats.json` | Historical reports |

---

## Quick Command Reference

### Setup
```bash
npm run add-account      # Add single account (interactive)
npm run setup-mother     # Configure mother group
npm run create-slave     # Create slave group
```

### Campaign
```bash
npm run campaign         # Full cycle: scrape + add + report
npm run campaign:scrape  # Find groups, extract members
npm run campaign:add     # Add queued members to slaves
npm run campaign:daemon  # Start automated scheduler
npm run report           # Generate stats report
```

### Bulk Operations
```bash
npm run create-accounts -- --count 20 --provider smspool --country UK
```

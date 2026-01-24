# Telegram Automation Architecture

Internal documentation for the Telegram mother-slave funnel system.

**Last Updated:** 2026-01-24

---

## Overview

The Telegram automation system implements a **mother-slave funnel** for member acquisition at scale. Members are scraped from target groups, added to disposable "slave" groups, then redirected to a protected "mother" group via welcome messages.

**Key Stats:**
- Cost: ~$0.01 CPL at scale
- Capacity: 10,000-50,000 members/month
- Account pool: 20-30 rotating accounts

---

## The Mother-Slave Funnel

```
TARGET GROUPS (AI/MMO/Ecom keywords)
         |
         | GroupFinder.searchByNiche()
         | MemberExtractor.extractFromGroup()
         v
    MEMBER QUEUE (members.json)
         |
         | MemberAdder.addBatch() -> 45s between adds
         | AccountPool.getNextAccount() -> round-robin
         v
    SLAVE GROUPS (disposable buffer)
         |
         | Welcome message with mother link
         | User clicks -> organic join
         v
    MOTHER GROUP (protected destination)
         |
         v
    Your funnels ($99 offers, calls)
```

### Why This Architecture Works

1. **Slaves = Buffer Layer** - If banned, create replacement in 5 min (costs $0)
2. **Mother = Safe Zone** - Never has bot activity, members join organically
3. **Account Rotation** - One ban doesn't kill the system
4. **Health Tracking** - Prevents pushing accounts to permanent ban
5. **Niche Targeting** - AI groups -> AI buyers, quality leads

---

## Directory Structure

```
telegram-automation/
├── src/
│   ├── core/                    # System orchestration & monitoring
│   │   ├── orchestrator.ts      # Main coordinator (334 lines)
│   │   ├── health-monitor.ts    # Account/group health (142 lines)
│   │   └── reporter.ts          # Daily statistics (165 lines)
│   │
│   ├── scraper/                 # Member acquisition pipeline
│   │   ├── group-finder.ts      # Find target groups (126 lines)
│   │   ├── member-extractor.ts  # Extract members (206 lines)
│   │   └── queue-manager.ts     # Manage queue (75 lines)
│   │
│   ├── accounts/                # Account pool management
│   │   └── pool-manager.ts      # 20-30 account rotation (283 lines)
│   │
│   ├── groups/                  # Group management
│   │   ├── slave-manager.ts     # Disposable slave groups (235 lines)
│   │   ├── mother-manager.ts    # Protected mother group (84 lines)
│   │   └── adder.ts             # Add members with retry (168 lines)
│   │
│   ├── services/                # External integrations
│   │   └── telegram-client.ts   # gramjs wrapper (245 lines)
│   │
│   ├── utils/                   # Shared utilities
│   │   ├── config.ts            # Rate limits & keywords (73 lines)
│   │   ├── data-store.ts        # JSON persistence (122 lines)
│   │   ├── retry.ts             # Exponential backoff (239 lines)
│   │   ├── proxy-manager.ts     # Proxy configuration
│   │   └── sms-providers.ts     # DaisySMS/SMSPool integration
│   │
│   └── types/                   # TypeScript definitions
│       └── index.ts             # All type interfaces (183 lines)
│
├── scripts/                     # CLI tools
│   ├── add-account.ts           # Add single account
│   ├── create-accounts.ts       # Bulk create via SMS providers
│   ├── setup-mother.ts          # Configure mother group
│   ├── create-slave.ts          # Create slave group
│   └── run-campaign.ts          # Main campaign runner
│
└── data/                        # JSON storage (persistent)
    ├── accounts.json            # Account pool with health
    ├── slaves.json              # Slave groups
    ├── mother.json              # Mother group config
    ├── members.json             # Scraped members
    ├── processed.json           # Members already added
    ├── blacklist.json           # Blocked members
    ├── groups.json              # Target groups found
    └── daily-stats.json         # Historical reports
```

---

## Core Data Types

### Account Types

```typescript
type AccountStatus = 'warming' | 'active' | 'cooldown' | 'banned' | 'retired'

TelegramAccount {
  id: string                     // UUID
  phone: string                  // +1234567890
  sessionString: string          // Encrypted session token
  apiId: number                  // Telegram API ID
  apiHash: string                // Telegram API hash
  proxy?: ProxyConfig            // SOCKS5 proxy
  status: AccountStatus
  healthScore: number            // 0-100 (100 = perfect)
  dailyAdds: number              // Reset daily at midnight
  dailyJoins: number
  dailyMessages: number
  lastUsed: string               // ISO timestamp
  warmupStarted?: string
  cooldownUntil?: string         // When cooldown expires
  assignedSlaves: string[]       // Slave IDs this account created
  createdAt: string
  notes?: string
}
```

### Member Types

```typescript
type MemberStatus = 'queued' | 'added' | 'failed' | 'blacklisted'

ScrapedMember {
  id: string                     // UUID
  oduserId: string               // Telegram user ID
  username?: string
  firstName?: string
  lastName?: string
  sourceGroup: string            // Which target group they came from
  sourceNiche: Niche
  scrapedAt: string
  status: MemberStatus
  addedTo?: string               // Slave group ID (after adding)
  addedAt?: string
  addedBy?: string               // Account ID that added them
  failReason?: string
}
```

### Group Types

```typescript
type Niche = 'ai' | 'mmo' | 'ecom' | 'other'
type GroupStatus = 'active' | 'warned' | 'banned' | 'retired'

SlaveGroup {
  id: string
  chatId: string                 // Telegram chat ID
  username: string
  title: string
  niche: Niche
  inviteLink: string
  motherLink: string             // Redirect destination
  welcomeMessage: string         // Auto-sent with {MOTHER_LINK}
  status: GroupStatus
  memberCount: number
  redirectCount: number          // How many joined mother
  createdAt: string
  createdBy: string              // Account ID
  lastHealthCheck: string
}
```

---

## Key Components

### Orchestrator (`src/core/orchestrator.ts`)

Main coordinator that wires all components together.

```typescript
class Orchestrator {
  - accountPool: AccountPool
  - groupFinder: GroupFinder
  - memberExtractor: MemberExtractor
  - queueManager: QueueManager
  - slaveManager: SlaveManager
  - motherManager: MotherManager
  - memberAdder: MemberAdder
  - healthMonitor: HealthMonitor
  - reporter: Reporter

  async initialize()           // Shows system status at startup
  async runScrapeCycle(niche?) // Find groups, extract members
  async runAddingCycle()       // Add queued members to slaves
  startScheduler()             // Start cron jobs
  async stop()                 // Clean shutdown
}
```

**Scheduler (node-cron):**
- Health check: Every 5 minutes
- Adding cycle: Hourly (8am-10pm)
- Daily report: 10pm
- Reset counters: Midnight

### Account Pool (`src/accounts/pool-manager.ts`)

Manages 20-30 Telegram accounts with rotation and health tracking.

```typescript
class AccountPool {
  getAll()                     // All accounts
  getActive()                  // Status: 'active'
  getAvailableForAdding()      // Active + under daily limit + healthy
  getNextAccount()             // Round-robin: least-recently-used

  async getClient(id)          // Get connected TelegramClient
  async disconnectClient(id)   // Clean disconnect

  incrementDailyAdds(id)       // Track +1 add
  updateStatus(id, status)     // warming -> active -> cooldown -> banned
  decrementHealth(id, amount)  // Reduce health on errors
  resetDailyCounters()         // Called at midnight
  checkCooldowns()             // Release accounts from cooldown
}
```

**Health Score System:**
- Starts at 100
- -5 to -20 on errors (depends on severity)
- Auto-cooldown when score < 20
- Recovery: +20 per cooldown period

### Member Adder (`src/groups/adder.ts`)

Adds members to slave groups with intelligent retry and error handling.

**Error Handling Strategy:**

| Error | Action |
|-------|--------|
| `FLOOD_WAIT_X` | Put account in cooldown, wait X seconds |
| `PEER_FLOOD` | -20 health, immediate cooldown (serious) |
| `USER_PRIVACY_RESTRICTED` | Mark failed, skip user |
| `USER_BANNED_IN_CHANNEL` | Blacklist user |
| `CHAT_ADMIN_REQUIRED` | Log warning (slave needs admin rights) |
| `USER_NOT_MUTUAL_CONTACT` | Mark failed (user restricts adds) |
| `USER_CHANNELS_TOO_MUCH` | Mark failed (user in too many groups) |
| Network/timeout | Retry with exponential backoff |

### Slave Manager (`src/groups/slave-manager.ts`)

Manages disposable slave groups for member funneling.

**Slave Titles per Niche:**
- AI: "AI Wealth Hub", "AI Automation Pro", "AI Business Secrets"
- MMO: "Cash Flow Crew", "Income Insiders", "Wealth Builders"
- Ecom: "Ecom Insiders", "Dropship Elite", "Seller Success"

**Welcome Templates (with {MOTHER_LINK} placeholder):**
```
AI: "Welcome to AI Wealth Hub!
We've moved to a bigger, better community.
Join us: {MOTHER_LINK}"

MMO: "Welcome to Cash Flow Crew!
Our main community has way more value.
Join: {MOTHER_LINK}"

Ecom: "Welcome to Ecom Insiders!
The real action is in our main group.
Join: {MOTHER_LINK}"
```

---

## Rate Limits & Configuration

```typescript
interface Config {
  rateLimits: {
    maxAddsPerAccountPerDay: 50        // Hard daily limit
    maxJoinsPerAccountPerDay: 10
    maxMessagesPerAccountPerDay: 30
    maxScrapesPerDay: 30
    delayBetweenAddsMs: 45000          // 45 seconds between adds
    delayBetweenJoinsMs: 60000         // 60 seconds between joins
    cooldownHours: 48                  // Duration of cooldown
    healthThreshold: 20                // Health < 20 = auto-cooldown
  },
  warmupDays: 14,                       // New accounts need 14 days
  targetNiches: ['ai', 'mmo', 'ecom'],
  searchKeywords: {
    ai: ['AI tools', 'ChatGPT', 'AI business', 'automation', 'AI money'],
    mmo: ['passive income', 'side hustle', 'make money online', 'online business'],
    ecom: ['dropshipping', 'Shopify', 'Amazon FBA', 'ecommerce']
  }
}
```

---

## CLI Commands

### Setup Commands

```bash
# Add single account (interactive)
npm run add-account

# Configure mother group
npm run setup-mother

# Create slave group
npm run create-slave

# Bulk create accounts via SMS provider
npm run create-accounts -- --count 20 --provider smspool --country UK
```

### Campaign Commands

```bash
# Full cycle: scrape + add + report
npm run campaign

# Scrape only (find groups, extract members)
npm run campaign:scrape
npm run campaign:scrape ai    # Single niche

# Add only (process queue)
npm run campaign:add

# Daemon mode (runs scheduler)
npm run campaign:daemon

# Generate report
npm run report
```

---

## Data Flow Walkthrough

### Full Campaign Run

```
1. INITIALIZATION
   ├─ Load accounts, slaves, mother
   ├─ Show system status
   └─ Run health check

2. SCRAPE CYCLE
   ├─ GroupFinder.searchByNiche('ai')
   │  ├─ Get account from pool (round-robin)
   │  ├─ Connect TelegramClient with proxy
   │  ├─ Search keywords: "AI tools", "ChatGPT", etc.
   │  ├─ Find groups (max 20 per keyword)
   │  ├─ Dedup & store in groups.json
   │  └─ 5s delay between keywords
   │
   ├─ Repeat for 'mmo', 'ecom' niches
   └─ Disconnect client

3. EXTRACTION CYCLE (for each unscraped group)
   ├─ MemberExtractor.extractFromGroup(group)
   │  ├─ Get account from pool
   │  ├─ Join group (if has username)
   │  ├─ Fetch members (limit 200)
   │  ├─ For each member:
   │  │  ├─ Check: already processed? -> skip
   │  │  ├─ Check: blacklisted? -> skip
   │  │  └─ Create ScrapedMember, status: 'queued'
   │  ├─ Add to members.json
   │  └─ Mark group.scraped = true
   │
   └─ 10s delay between groups

4. ADDING CYCLE
   ├─ QueueManager.getNextBatchAny(100)
   │
   ├─ MemberAdder.addBatch(members)
   │  └─ For each member:
   │     ├─ Get account (round-robin, healthy)
   │     ├─ Select slave (least-populated)
   │     │
   │     ├─ Add member with retry:
   │     │  ├─ withRetry(client.addUserToGroup())
   │     │  ├─ Max 3 retries
   │     │  ├─ Backoff: 2s -> 4s -> 8s
   │     │  └─ FLOOD_WAIT handling
   │     │
   │     ├─ On success:
   │     │  ├─ Mark member.status = 'added'
   │     │  ├─ Increment slave.memberCount
   │     │  ├─ Increment account.dailyAdds
   │     │
   │     ├─ On error:
   │     │  ├─ Classify error
   │     │  ├─ Mark failed or blacklist
   │     │  ├─ Decrement account.healthScore
   │     │
   │     └─ 45s delay between adds
   │
   └─ Return { success, failed }

5. HEALTH CHECK
   ├─ Check cooldowns (release if expired)
   ├─ Check slave redirect rates
   └─ Print summary

6. REPORT
   ├─ Collect stats from all components
   ├─ Save to daily-stats.json
   └─ Print formatted report
```

---

## Scaling Characteristics

### Per-Account Capacity

```
Daily limits (per account):
- Adds: 50 members/day
- Joins: 10 groups/day
- Messages: 30 messages/day

Delays between operations:
- Between adds: 45 seconds
- Between joins: 60 seconds
- Between searches: 5 seconds

Max daily per account: 50 adds x 45s = 37.5 minutes of adding
```

### Scaling Examples

| Accounts | Daily Capacity | Monthly | Cost/Month | CPL |
|----------|----------------|---------|------------|-----|
| 10 | 500 adds | 15,000 | ~$50 | $0.003 |
| 20 | 1,000 adds | 30,000 | ~$90 | $0.003 |
| 30 | 1,500 adds | 45,000 | ~$115 | $0.003 |

**Cost breakdown:**
- Accounts: $2-3 per account (SMS verification)
- Proxies: $3-5/month per account
- Infrastructure: Minimal (runs on any server)

---

## Account Lifecycle

```
Account States:
  warming (14 days) -> active -> cooldown (48h) -> active
                                    |
                                 banned -> retired
```

**Warmup Period:**
- New accounts: 14-day warmup
- Reduced daily limits during warmup
- Status changes to 'active' automatically

**Cooldown:**
- Triggered by FLOOD_WAIT or low health (<20)
- Duration: 48 hours
- Health recovery: +20 during cooldown

---

## Retry System

Exponential backoff with Telegram FLOOD_WAIT handling:

```typescript
async withRetry(fn, options)
  - maxRetries: 5
  - baseDelayMs: 1000
  - maxDelayMs: 60000
  - Jitter: +/-25% random

Backoff sequence: 1s -> 2s -> 4s -> 8s -> 16s -> 32s (cap 60s)

FLOOD_WAIT handling:
  - Extracts seconds from error message
  - Respects Telegram's wait time + 5s buffer
```

**Retryable errors:**
- FLOOD_WAIT (rate limit)
- Network errors (timeout, connection, ECONNRESET)
- Server errors (500, 502, 503)

**Permanent errors (no retry):**
- USER_PRIVACY_RESTRICTED
- USER_BANNED_IN_CHANNEL
- CHAT_ADMIN_REQUIRED
- CHANNEL_PRIVATE
- USER_ALREADY_PARTICIPANT

---

## Deduplication Layers

1. **Member extraction:** Skip already-processed & blacklisted
2. **Queue processing:** Check processed.json before adding
3. **Blacklist:** Persistent list of banned users
4. **Account limits:** Never exceed daily add count

---

## Setup Checklist

### Initial Setup

1. **Get API credentials from my.telegram.org**
   - Create application
   - Note API ID and API Hash

2. **Add accounts to pool**
   ```bash
   npm run add-account
   # Repeat for each account (20-30 recommended)
   ```

3. **Configure mother group**
   ```bash
   npm run setup-mother
   ```

4. **Create slave groups (3-5 per niche)**
   ```bash
   npm run create-slave
   # Select niche: ai, mmo, or ecom
   ```

5. **Start daemon**
   ```bash
   npm run campaign:daemon
   ```

### Ongoing Operations

- Monitor daily reports
- Replace banned accounts
- Replace banned slaves
- Check health scores

---

## Related Documentation

- [StorePro CLAUDE.md](../../CLAUDE.md) - Main project overview
- [Telegram Automation README](../../telegram-automation/README.md) - Quick start guide
- [Traffic Strategy Overview](../../strategies/traffic-strategy-overview.md) - Full traffic pillar strategy

---

*This is internal documentation for the StorePro Operations team.*

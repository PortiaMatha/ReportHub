# ReportHub — Automated Monthly Client Reports

A Next.js app that generates monthly performance reports by pulling live data from GA4, PageSpeed Insights, SEMrush, ClickUp, and Sprout Social, with domain change tracking and AI-powered summaries.

You add a client once (domain + the relevant IDs from GA4/SEMrush/ClickUp/GitHub/Sprout Social), hit **Sync**, and the app pulls that month's data, diffs it against last month, and writes an AI summary you can hand straight to the client as a PDF or Word doc.

---

## Features

- **Multi-client** — manage unlimited clients, each with their own integrations
- **GA4** — sessions, users, bounce rate, top pages, month-over-month deltas
- **PageSpeed Insights** — desktop + mobile Core Web Vitals scores
- **SEMrush** — site health, errors, warnings, crawlability, internal linking
- **ClickUp** — open/completed tasks with live status
- **Sprout Social** — impressions, engagement, reach, and follower growth for Social/Influencer Management KPIs
- **Domain crawler** — detects Shopify version, theme, tech stack, SSL, and diffs changes month-over-month
- **AI Summary** — Claude writes a plain-English summary + prioritised recommendations
- **KPI tracking** — weekly/cumulative KPIs per client with goals and pacing
- **Export** — one-click PDF (Puppeteer) or Word doc

> **Note:** the Login/Register screens are UI only right now — there's no real authentication yet, so anyone with access to the running app reaches the dashboard directly. Don't expose a deployment publicly without adding auth first.

---

## Requirements

- [Node.js](https://nodejs.org/) 18.18+ (Next.js 15 requirement)
- npm (comes with Node)
- Git

Everything else (database, integrations) is configured through `.env` — no external services are required just to run the app, but reports will show empty/zero data for any integration you haven't configured.

---

## Installation

### 1. Clone & install

```bash
git clone https://github.com/PortiaMatha/ReportHub.git
cd ReportHub
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in the keys you plan to use — you don't need all of them to get started, but each one you skip means that integration returns no data:

| Variable | Where to get it | Required for |
|---|---|---|
| `DATABASE_URL` | Leave as `file:./dev.db` for local use | App to start |
| `GA4_CLIENT_EMAIL` | Google Cloud Console → IAM → Service Accounts | GA4 stats |
| `GA4_PRIVATE_KEY` | Same service account JSON key | GA4 stats |
| `PAGESPEED_API_KEY` | [Google Developers Console](https://developers.google.com/speed/docs/insights/v5/get-started) | PageSpeed scores |
| `SEMRUSH_API_KEY` | [SEMrush API Analytics](https://www.semrush.com/api-analytics/) | SEMrush data |
| `CLICKUP_API_TOKEN` | ClickUp → Settings → Apps | ClickUp tasks |
| `SPROUT_API_TOKEN` | Sprout Social → Account and settings → API | Social/Influencer KPIs |
| `SPROUT_CUSTOMER_ID` | `GET https://api.sproutsocial.com/v1/metadata/client` | Social/Influencer KPIs |
| `ANTHROPIC_API_KEY` | [Anthropic Console](https://console.anthropic.com) | AI summaries |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for local dev | PDF/doc export |

See the "Setting up ..." sections below for step-by-step instructions per integration.

### 3. Set up the database

This creates a local SQLite database (`prisma/dev.db`) from the schema:

```bash
npm run db:push
npm run db:generate
```

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll land on the dashboard directly.

---

## Using the app

1. **Add a client** — go to the **Clients** tab → **Add Client** → enter their name and domain, plus whichever integration IDs you have (GA4 Property ID, SEMrush Project ID, ClickUp List ID, GitHub repo, Sprout Social Profile ID). Any field can be left blank and filled in later.
2. **Sync data** — select the client, go to the **Reports** tab, and click **Sync**. This pulls fresh data from every configured integration for the current month in parallel and stores it as a report.
3. **Review the report** — GA4, PageSpeed, SEMrush, ClickUp, and domain-change data appear as report sections with month-over-month deltas.
4. **Generate the AI summary** — click **Regenerate Summary** on the report to have Claude write a plain-English overview plus 4-6 prioritised recommendations. You can regenerate it any time.
5. **Track KPIs** — the **Overview**/KPI views let you define weekly or cumulative KPIs per client (e.g. traffic, leads) with goals and pacing, tracked independently of the monthly sync.
6. **Export** — from the report view, export the finished report as a **PDF** or **Word doc** to send to the client.
7. **Manage integrations** — the **Integrations** tab shows connection status per source and is where you diagnose a failed sync (each source fails independently, so one bad API key won't block the rest of the report).

---

## Setting up GA4

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → Enable **Google Analytics Data API**
3. Create a **Service Account** → Download JSON key
4. Copy `client_email` → `GA4_CLIENT_EMAIL`
5. Copy `private_key` → `GA4_PRIVATE_KEY`
6. In GA4 Admin → Property Access Management → add the service account email with **Viewer** role
7. Find your **Property ID** (the number in GA4 Admin) → use this per client

---

## Setting up PageSpeed

Free, just needs an API key:
1. Go to [https://developers.google.com/speed/docs/insights/v5/get-started](https://developers.google.com/speed/docs/insights/v5/get-started)
2. Click **Get a Key** → create a project → copy key

---

## Setting up SEMrush

1. Log into SEMrush → top right menu → **API**
2. Copy your API key
3. For site audit data, find your project ID in the URL when viewing a project: `semrush.com/siteaudit/project/**PROJECT_ID**/`

---

## Setting up ClickUp

1. ClickUp → Settings → Apps → **API Token**
2. Find your List ID: open a list → the number in the URL is the list ID
   `app.clickup.com/12345/v/li/**LIST_ID**`

---

## Setting up Sprout Social

Requires the **Advanced** Sprout plan (or higher) with the **API Permissions** entitlement on your user — ask your Sprout Account Owner to grant it if you don't have it.

1. In Sprout: your name → **Account and settings** → **API** (under Global Features) → **Generate API Token** → copy it into `SPROUT_API_TOKEN`
2. Get your account-level customer ID with `GET https://api.sproutsocial.com/v1/metadata/client` (using that same token) → paste into `SPROUT_CUSTOMER_ID`
3. List every profile connected to your Sprout account with `GET https://api.sproutsocial.com/v1/<customer ID>/metadata/customer` — each entry has a `customer_profile_id`, `network_type`, and `name`
4. Per client, add every one of their **Sprout Profile IDs** (comma-separated — Facebook, Instagram, LinkedIn, TikTok, etc.) in the client's edit form. Metrics are summed across all of them, so a client's "Social" numbers reflect their whole social presence, not just one platform.

Powers: Engagement Rate, Follower Growth, Impressions, Views, Saves, Shares (Social) and Engagement Rate, Reach, Impressions (Influencer Management). Sprout's public API doesn't expose paid/ad-account data, so **Paid Media** KPIs (CPC, CTR, ROAS, spend) aren't available through this integration — those would need to come from Meta/Google/TikTok Ads APIs directly.

> Impressions and Engagements are confirmed against Sprout's own API docs; Reach, Follower Growth, Views, Saves, and Shares follow Sprout's documented naming convention but aren't individually confirmed. An unsupported metric name fails the sync with a clear error rather than returning wrong data — if a metric errors, check the field name against a live response from `analytics/profiles` and adjust `src/lib/integrations/sproutsocial.ts`.

---

## Domain Change Tracking

The app automatically crawls each client's domain when you sync and stores a snapshot per month. The next month's sync diffs against last month to detect:

- Shopify version bumps
- Theme changes
- Tech stack additions/removals (GTM, Klaviyo, Meta Pixel, etc.)
- SSL certificate changes

---

## AI Summary

Uses Claude to write a 3-4 paragraph plain-English summary for the client and generates 4-6 prioritised recommendations across: Performance, SEO, Security, UX, and Content.

You can regenerate the summary at any time from the report view.

---

## Deployment

Deploy to **Vercel** (recommended):

```bash
npm i -g vercel
vercel
```

Add all environment variables in the Vercel dashboard under Project → Settings → Environment Variables.

For the SQLite database in production, switch to **Turso** (free tier):
1. `npm install @libsql/client`
2. Update `prisma/schema.prisma` provider to `turso`
3. Add `DATABASE_URL` and `DATABASE_AUTH_TOKEN` from Turso dashboard

---

## File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── clients/          # CRUD for clients
│   │   ├── reports/          # Report read/update
│   │   ├── sync/             # Main data sync orchestrator
│   │   └── ai-summary/       # Regenerate AI summary
│   └── page.tsx              # Dashboard
├── components/
│   ├── ClientSidebar.tsx
│   ├── ReportView.tsx        # Full report UI
│   └── ClientForm.tsx        # Add/edit client modal
├── lib/
│   ├── integrations/
│   │   ├── ga4.ts
│   │   ├── pagespeed.ts
│   │   ├── semrush.ts
│   │   ├── clickup.ts
│   │   ├── sproutsocial.ts
│   │   └── domain.ts         # Crawler + diff
│   ├── ai-summary.ts
│   └── prisma.ts
├── types/
│   └── index.ts
prisma/
└── schema.prisma
```

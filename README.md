# ReportHub — Automated Monthly Client Reports

A Next.js app that generates monthly performance reports by pulling live data from GA4, PageSpeed Insights, SEMrush, and ClickUp, with domain change tracking and AI-powered summaries.

---

## Features

- **Multi-client** — manage unlimited clients, each with their own integrations
- **GA4** — sessions, users, bounce rate, top pages, month-over-month deltas
- **PageSpeed Insights** — desktop + mobile Core Web Vitals scores
- **SEMrush** — site health, errors, warnings, crawlability, internal linking
- **ClickUp** — open/completed tasks with live status
- **Domain crawler** — detects Shopify version, theme, tech stack, SSL, and diffs changes month-over-month
- **AI Summary** — Claude writes a plain-English summary + prioritised recommendations
- **PDF Export** — one-click PDF using Puppeteer

---

## Quick Start

### 1. Clone & install

```bash
git clone <your-repo>
cd report-hub
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`:

| Variable | Where to get it |
|---|---|
| `GA4_CLIENT_EMAIL` | Google Cloud Console → IAM → Service Accounts |
| `GA4_PRIVATE_KEY` | Same service account JSON key |
| `PAGESPEED_API_KEY` | [Google Developers Console](https://developers.google.com/speed/docs/insights/v5/get-started) |
| `SEMRUSH_API_KEY` | [SEMrush API Analytics](https://www.semrush.com/api-analytics/) |
| `CLICKUP_API_TOKEN` | ClickUp → Settings → Apps |
| `ANTHROPIC_API_KEY` | [Anthropic Console](https://console.anthropic.com) |

### 3. Set up database

```bash
npm run db:push
npm run db:generate
```

### 4. Run dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

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
│   │   └── domain.ts         # Crawler + diff
│   ├── ai-summary.ts
│   └── prisma.ts
├── types/
│   └── index.ts
prisma/
└── schema.prisma
```

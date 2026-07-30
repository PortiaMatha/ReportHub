import axios from 'axios'

const SPROUT_API = 'https://api.sproutsocial.com/v1'

// Verified live against a real account (2026-07): impressions, reactions, net_follower_growth,
// video_views, saves, and shares all return real per-profile data. Deliberately excludes "reach" —
// Sprout doesn't expose a summable reach metric via this endpoint (they only offer "Average Reach
// per Post" through a different report), and an unrecognized key here comes back as a silent 0
// rather than an error, so a wrong guess would show up as fabricated-looking data, not a failure.
const METRICS = ['impressions', 'reactions', 'net_follower_growth', 'video_views', 'saves', 'shares']

interface SproutProfileRow {
  dimensions: { 'reporting_period.by(day)': string; customer_profile_id: number }
  metrics: Record<string, number>
}

// Sums metrics across every profile passed in — combining multiple platforms (Facebook, Instagram,
// LinkedIn, etc.) into one figure per client, rather than reporting on a single channel. Works for
// any date range (a week for KPI syncs, a full month for the monthly report).
export async function fetchSproutMetrics(profileIds: string[], startDate: string, endDate: string) {
  const customerId = process.env.SPROUT_CUSTOMER_ID
  const token = process.env.SPROUT_API_TOKEN
  if (!customerId || !token) throw new Error('Sprout Social is not configured')
  if (profileIds.length === 0) throw new Error('No Sprout Social profiles configured for this client')

  const response = await axios.post(
    `${SPROUT_API}/${customerId}/analytics/profiles`,
    {
      filters: [
        `customer_profile_id.eq(${profileIds.join(',')})`,
        `reporting_period.in(${startDate}...${endDate})`,
      ],
      metrics: METRICS,
    },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  )

  const rows: SproutProfileRow[] = response.data.data || []
  const sum = (key: string) => rows.reduce((total, row) => total + (row.metrics[key] || 0), 0)

  return {
    impressions: sum('impressions'),
    engagements: sum('reactions'),
    followerGrowth: sum('net_follower_growth'),
    videoViews: sum('video_views'),
    saves: sum('saves'),
    shares: sum('shares'),
  }
}

function monthRange(month: number, year: number) {
  const start = new Date(Date.UTC(year, month - 1, 1))
  const end = new Date(Date.UTC(year, month, 0))
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
}

// Current month totals plus month-over-month deltas, for the monthly report / AI summary.
export async function fetchSproutMonthlyData(profileIds: string[], month: number, year: number) {
  const current = monthRange(month, year)
  const prevDate = new Date(Date.UTC(year, month - 2, 1))
  const previous = monthRange(prevDate.getUTCMonth() + 1, prevDate.getUTCFullYear())

  const [curData, prevData] = await Promise.all([
    fetchSproutMetrics(profileIds, current.start, current.end),
    fetchSproutMetrics(profileIds, previous.start, previous.end),
  ])

  const delta = (cur: number, prev: number) => (prev === 0 ? 0 : Math.round(((cur - prev) / prev) * 1000) / 10)

  return {
    sproutImpressions: curData.impressions,
    sproutImpressionsDelta: delta(curData.impressions, prevData.impressions),
    sproutEngagements: curData.engagements,
    sproutEngagementsDelta: delta(curData.engagements, prevData.engagements),
    sproutFollowerGrowth: curData.followerGrowth,
    sproutVideoViews: curData.videoViews,
    sproutSaves: curData.saves,
    sproutShares: curData.shares,
  }
}

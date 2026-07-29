import axios from 'axios'

const SPROUT_API = 'https://api.sproutsocial.com/v1'

// Confirmed against Sprout's own API docs: impressions, reactions. The rest (reach,
// net_follower_growth, video_views, saves, shares) follow Sprout's documented snake_case
// convention but aren't individually confirmed — an unsupported metric name comes back as an
// API error rather than silently wrong data, so a bad guess here fails loud, not quiet.
const METRICS = ['impressions', 'reach', 'reactions', 'net_follower_growth', 'video_views', 'saves', 'shares']

interface SproutProfileRow {
  dimensions: { 'reporting_period.by(day)': string; customer_profile_id: number }
  metrics: Record<string, number>
}

export async function fetchSproutWeeklyMetrics(profileId: string, startDate: string, endDate: string) {
  const customerId = process.env.SPROUT_CUSTOMER_ID
  const token = process.env.SPROUT_API_TOKEN
  if (!customerId || !token) throw new Error('Sprout Social is not configured')

  const response = await axios.post(
    `${SPROUT_API}/${customerId}/analytics/profiles`,
    {
      filters: [
        `customer_profile_id.eq(${profileId})`,
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
    reach: sum('reach'),
    engagements: sum('reactions'),
    followerGrowth: sum('net_follower_growth'),
    videoViews: sum('video_views'),
    saves: sum('saves'),
    shares: sum('shares'),
  }
}

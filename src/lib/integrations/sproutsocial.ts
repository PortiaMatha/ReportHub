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
// LinkedIn, etc.) into one figure per client, rather than reporting on a single channel.
export async function fetchSproutWeeklyMetrics(profileIds: string[], startDate: string, endDate: string) {
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

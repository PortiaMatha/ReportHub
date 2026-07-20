import { BetaAnalyticsDataClient } from '@google-analytics/data'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { formatDurationSeconds } from '@/lib/kpi'

const analyticsDataClient = new BetaAnalyticsDataClient({
  credentials: {
    client_email: process.env.GA4_CLIENT_EMAIL,
    private_key: process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
})

export async function fetchGA4Data(propertyId: string, month: number, year: number) {
  const date = new Date(year, month - 1, 1)
  const startDate = format(startOfMonth(date), 'yyyy-MM-dd')
  const endDate = format(endOfMonth(date), 'yyyy-MM-dd')

  const prevDate = subMonths(date, 1)
  const prevStart = format(startOfMonth(prevDate), 'yyyy-MM-dd')
  const prevEnd = format(endOfMonth(prevDate), 'yyyy-MM-dd')

  const [currentResponse, prevResponse, topPagesResponse, dailyResponse] = await Promise.all([
    analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
        { name: 'newUsers' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' },
      ],
    }),
    analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: prevStart, endDate: prevEnd }],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
        { name: 'newUsers' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' },
      ],
    }),
    analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 5,
    }),
    analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    }),
  ])

  const cur = currentResponse[0]?.rows?.[0]?.metricValues
  const prev = prevResponse[0]?.rows?.[0]?.metricValues

  const sessions = parseInt(cur?.[0]?.value || '0')
  const prevSessions = parseInt(prev?.[0]?.value || '0')
  const totalUsers = parseInt(cur?.[1]?.value || '0')
  const prevTotalUsers = parseInt(prev?.[1]?.value || '0')
  const newUsers = parseInt(cur?.[2]?.value || '0')
  const prevNewUsers = parseInt(prev?.[2]?.value || '0')
  const avgDurationSec = parseFloat(cur?.[3]?.value || '0')
  const bounceRate = parseFloat(cur?.[4]?.value || '0') * 100
  const prevBounceRate = parseFloat(prev?.[4]?.value || '0') * 100

  const delta = (cur: number, prev: number) =>
    prev === 0 ? 0 : Math.round(((cur - prev) / prev) * 1000) / 10

  const topPages = (topPagesResponse[0]?.rows || []).map((row) => ({
    path: row.dimensionValues?.[0]?.value || '',
    sessions: parseInt(row.metricValues?.[0]?.value || '0'),
  }))

  const dailySessions = (dailyResponse[0]?.rows || []).map((row) => ({
    date: row.dimensionValues?.[0]?.value || '',
    sessions: parseInt(row.metricValues?.[0]?.value || '0'),
  }))

  return {
    sessions,
    sessionsDelta: delta(sessions, prevSessions),
    totalUsers,
    totalUsersDelta: delta(totalUsers, prevTotalUsers),
    newUsers,
    newUsersDelta: delta(newUsers, prevNewUsers),
    avgSessionDuration: formatDurationSeconds(avgDurationSec),
    bounceRate: Math.round(bounceRate * 10) / 10,
    bounceRateDelta: delta(bounceRate, prevBounceRate),
    topPages,
    dailySessions,
  }
}

export async function fetchGA4WeeklyMetrics(propertyId: string, startDate: string, endDate: string) {
  const [response] = await analyticsDataClient.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    metrics: [
      { name: 'sessions' },
      { name: 'averageSessionDuration' },
      { name: 'bounceRate' },
      { name: 'engagedSessions' },
    ],
  })

  const row = response.rows?.[0]?.metricValues
  const sessions = parseInt(row?.[0]?.value || '0')
  const avgSessionDurationSeconds = parseFloat(row?.[1]?.value || '0')
  const bounceRate = Math.round(parseFloat(row?.[2]?.value || '0') * 1000) / 10
  const engagedSessions = parseInt(row?.[3]?.value || '0')

  return { sessions, avgSessionDurationSeconds, bounceRate, engagedSessions }
}

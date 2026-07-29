import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchGA4WeeklyMetrics } from '@/lib/integrations/ga4'
import { fetchSEMrushData } from '@/lib/integrations/semrush'
import { fetchPageSpeedData } from '@/lib/integrations/pagespeed'
import { fetchClickUpTasks } from '@/lib/integrations/clickup'
import { fetchSproutWeeklyMetrics } from '@/lib/integrations/sproutsocial'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { weekStart } = await req.json()
  if (!weekStart) return NextResponse.json({ error: 'weekStart is required' }, { status: 400 })

  const kpi = await prisma.kpi.findUnique({ where: { id }, include: { client: true } })
  if (!kpi) return NextResponse.json({ error: 'KPI not found' }, { status: 404 })
  if (!kpi.source || !kpi.metricKey) {
    return NextResponse.json({ error: 'This KPI has no linked integration — enter its value manually' }, { status: 400 })
  }

  const client = kpi.client
  let value: number | null = null
  let denominatorValue: number | null = null

  try {
    if (kpi.source === 'ga4') {
      if (!client.ga4PropertyId) throw new Error('No GA4 property configured for this client')
      const start = new Date(weekStart)
      const end = new Date(start)
      end.setUTCDate(start.getUTCDate() + 6)
      const iso = (d: Date) => d.toISOString().slice(0, 10)
      const data = await fetchGA4WeeklyMetrics(client.ga4PropertyId, iso(start), iso(end))

      if (kpi.metricKey === 'avgSessionDuration' && kpi.measurementType === 'duration') {
        // Total engagement seconds this week ÷ sessions this week — enables a true weighted YTD average.
        value = data.avgSessionDurationSeconds * data.sessions
        denominatorValue = data.sessions
      } else if (kpi.metricKey === 'bounceRate' && kpi.measurementType === 'rate') {
        // Bounces derived from raw totals rather than GA4's pre-aggregated weekly percentage.
        value = data.sessions - data.engagedSessions
        denominatorValue = data.sessions
      } else {
        const map: Record<string, number> = {
          sessions: data.sessions,
          avgSessionDuration: Math.round((data.avgSessionDurationSeconds / 60) * 100) / 100,
          bounceRate: data.bounceRate,
        }
        value = map[kpi.metricKey] ?? null
      }
    } else if (kpi.source === 'semrush') {
      if (!process.env.SEMRUSH_API_KEY) throw new Error('SEMrush is not configured')
      const data = await fetchSEMrushData(client.domain, client.semrushProjectId || undefined)
      value = (data as Record<string, number | null>)[kpi.metricKey] ?? null
    } else if (kpi.source === 'pagespeed') {
      const data = await fetchPageSpeedData(client.domain)
      value = (data as unknown as Record<string, number>)[kpi.metricKey] ?? null
    } else if (kpi.source === 'clickup') {
      if (!client.clickupListId) throw new Error('No ClickUp list configured for this client')
      const data = await fetchClickUpTasks(client.clickupListId)
      value = (data as unknown as Record<string, number>)[kpi.metricKey] ?? null
    } else if (kpi.source === 'sproutsocial') {
      if (!client.sproutProfileId) throw new Error('No Sprout Social profile configured for this client')
      const start = new Date(weekStart)
      const end = new Date(start)
      end.setUTCDate(start.getUTCDate() + 6)
      const iso = (d: Date) => d.toISOString().slice(0, 10)
      const data = await fetchSproutWeeklyMetrics(client.sproutProfileId, iso(start), iso(end))

      if (kpi.metricKey === 'engagementRate' && kpi.measurementType === 'rate') {
        // Reach-weighted rate — numerator/denominator entangled the same way GA4's bounceRate is.
        value = data.engagements
        denominatorValue = data.reach
      } else {
        const map: Record<string, number> = {
          impressions: data.impressions,
          reach: data.reach,
          followerGrowth: data.followerGrowth,
          videoViews: data.videoViews,
          saves: data.saves,
          shares: data.shares,
        }
        value = map[kpi.metricKey] ?? null
      }
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }

  if (value === null || value === undefined) {
    return NextResponse.json({ error: 'No data returned from the integration' }, { status: 400 })
  }

  const weekStartDate = new Date(weekStart)
  const entry = await prisma.kpiWeekValue.upsert({
    where: { kpiId_weekStart: { kpiId: id, weekStart: weekStartDate } },
    update: { value, denominatorValue },
    create: { kpiId: id, weekStart: weekStartDate, value, denominatorValue },
  })

  return NextResponse.json(entry)
}

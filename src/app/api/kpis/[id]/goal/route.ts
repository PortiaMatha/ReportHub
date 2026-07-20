import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { computeGoalFromBaselineAvg, computeGoalFromGrowth } from '@/lib/kpi'
import type { Kpi } from '@/types'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { method, growthPercent, baselineYear } = await req.json()

  const kpi = await prisma.kpi.findUnique({ where: { id }, include: { weeklyValues: true } })
  if (!kpi) return NextResponse.json({ error: 'KPI not found' }, { status: 404 })

  const year = baselineYear ?? new Date().getFullYear() - 1

  if (method === 'baseline_avg') {
    const result = computeGoalFromBaselineAvg(kpi as unknown as Kpi, year)
    if (!result) {
      return NextResponse.json({ error: `No logged weekly data for January/December ${year} yet` }, { status: 400 })
    }
    return NextResponse.json(result)
  }

  if (method === 'growth') {
    if (growthPercent === undefined || growthPercent === null || Number.isNaN(Number(growthPercent))) {
      return NextResponse.json({ error: 'growthPercent is required' }, { status: 400 })
    }
    const result = computeGoalFromGrowth(kpi as unknown as Kpi, year, Number(growthPercent))
    if (!result) {
      return NextResponse.json({ error: `No logged weekly data for ${year} yet` }, { status: 400 })
    }
    return NextResponse.json(result)
  }

  return NextResponse.json({ error: 'Unsupported goal method' }, { status: 400 })
}

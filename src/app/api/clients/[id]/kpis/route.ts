import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const kpis = await prisma.kpi.findMany({
    where: { clientId: id },
    orderBy: [{ section: 'asc' }, { order: 'asc' }],
    include: { weeklyValues: { orderBy: { weekStart: 'asc' } } },
  })
  return NextResponse.json(kpis)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  if (!body.section || !body.name) {
    return NextResponse.json({ error: 'section and name are required' }, { status: 400 })
  }
  const kpi = await prisma.kpi.create({
    data: {
      clientId: id,
      section: body.section,
      name: body.name,
      owner: body.owner || null,
      yearGoal: body.yearGoal || null,
      unit: body.unit || null,
      measurementType: body.measurementType || 'cumulative',
      direction: body.direction || 'higher',
      denominatorLabel: body.denominatorLabel || null,
      goalMethod: body.goalMethod || 'manual',
      goalBaseline: body.goalBaseline ?? null,
      goalGrowthPercent: body.goalGrowthPercent ?? null,
      pacingMethod: body.pacingMethod || 'straight_line',
      rangeLow: body.rangeLow ?? null,
      rangeHigh: body.rangeHigh ?? null,
      source: body.source || null,
      metricKey: body.metricKey || null,
      order: body.order ?? 0,
    },
    include: { weeklyValues: true },
  })
  return NextResponse.json(kpi, { status: 201 })
}

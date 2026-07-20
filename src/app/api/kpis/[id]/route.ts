import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const kpi = await prisma.kpi.update({
    where: { id },
    data: {
      section: body.section,
      name: body.name,
      owner: body.owner ?? null,
      yearGoal: body.yearGoal ?? null,
      unit: body.unit ?? null,
      measurementType: body.measurementType,
      direction: body.direction,
      denominatorLabel: body.denominatorLabel ?? null,
      goalMethod: body.goalMethod,
      goalBaseline: body.goalBaseline ?? null,
      goalGrowthPercent: body.goalGrowthPercent ?? null,
      pacingMethod: body.pacingMethod,
      rangeLow: body.rangeLow ?? null,
      rangeHigh: body.rangeHigh ?? null,
      source: body.source ?? null,
      metricKey: body.metricKey ?? null,
      order: body.order,
    },
    include: { weeklyValues: { orderBy: { weekStart: 'asc' } } },
  })
  return NextResponse.json(kpi)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.kpi.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

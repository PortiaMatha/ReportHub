import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  if (!body.weekStart) {
    return NextResponse.json({ error: 'weekStart is required' }, { status: 400 })
  }
  const weekStart = new Date(body.weekStart)
  const toNumberOrNull = (v: unknown) => (v === '' || v === null ? null : Number(v))

  // Only touch fields the caller actually sent — lets a commentary-only edit
  // avoid clobbering an already-logged value/denominator for that week.
  const fields: Record<string, unknown> = {}
  if ('value' in body) fields.value = toNumberOrNull(body.value)
  if ('denominatorValue' in body) fields.denominatorValue = toNumberOrNull(body.denominatorValue)
  if ('plannedTarget' in body) fields.plannedTarget = toNumberOrNull(body.plannedTarget)
  if ('commentary' in body) fields.commentary = body.commentary || null

  const entry = await prisma.kpiWeekValue.upsert({
    where: { kpiId_weekStart: { kpiId: id, weekStart } },
    update: fields,
    create: { kpiId: id, weekStart, ...fields },
  })
  return NextResponse.json(entry, { status: 201 })
}

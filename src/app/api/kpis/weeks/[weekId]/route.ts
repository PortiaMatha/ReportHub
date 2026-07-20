import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ weekId: string }> }) {
  const { weekId } = await params
  const body = await req.json()
  const toNumberOrNull = (v: unknown) => (v === '' || v === null ? null : Number(v))

  const data: Record<string, unknown> = {}
  if ('weekStart' in body) data.weekStart = new Date(body.weekStart)
  if ('value' in body) data.value = toNumberOrNull(body.value)
  if ('denominatorValue' in body) data.denominatorValue = toNumberOrNull(body.denominatorValue)
  if ('plannedTarget' in body) data.plannedTarget = toNumberOrNull(body.plannedTarget)
  if ('commentary' in body) data.commentary = body.commentary || null

  try {
    const entry = await prisma.kpiWeekValue.update({ where: { id: weekId }, data })
    return NextResponse.json(entry)
  } catch {
    return NextResponse.json({ error: 'Could not save — a week already exists on that date.' }, { status: 400 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ weekId: string }> }) {
  const { weekId } = await params
  await prisma.kpiWeekValue.delete({ where: { id: weekId } })
  return NextResponse.json({ success: true })
}

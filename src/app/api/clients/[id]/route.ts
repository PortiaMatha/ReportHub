import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      reports: { orderBy: [{ year: 'desc' }, { month: 'desc' }] },
      snapshots: { orderBy: [{ year: 'desc' }, { month: 'desc' }] },
    },
  })
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(client)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const client = await prisma.client.update({
    where: { id },
    data: {
      name: body.name,
      domain: body.domain,
      ga4PropertyId: body.ga4PropertyId,
      semrushProjectId: body.semrushProjectId,
      clickupListId: body.clickupListId,
      githubRepo: body.githubRepo,
      ytdStart: body.ytdStart !== undefined ? (body.ytdStart ? new Date(body.ytdStart) : null) : undefined,
      ytdEnd: body.ytdEnd !== undefined ? (body.ytdEnd ? new Date(body.ytdEnd) : null) : undefined,
    },
  })
  return NextResponse.json(client)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.client.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

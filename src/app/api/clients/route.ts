import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const clients = await prisma.client.findMany({
    orderBy: { name: 'asc' },
    include: {
      reports: {
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        take: 1,
        select: {
          id: true,
          month: true,
          year: true,
          status: true,
          updatedAt: true,
          sessions: true,
          desktopPerf: true,
          siteHealth: true,
          openTasks: true,
        },
      },
    },
  })
  return NextResponse.json(clients.map(c => ({
    ...c,
    sproutProfileIds: c.sproutProfileIds ? JSON.parse(c.sproutProfileIds) : [],
  })))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const client = await prisma.client.create({
    data: {
      name: body.name,
      domain: body.domain,
      ga4PropertyId: body.ga4PropertyId || null,
      semrushProjectId: body.semrushProjectId || null,
      clickupListId: body.clickupListId || null,
      githubRepo: body.githubRepo || null,
      sproutProfileIds: body.sproutProfileIds?.length ? JSON.stringify(body.sproutProfileIds) : null,
    },
  })
  return NextResponse.json(client, { status: 201 })
}

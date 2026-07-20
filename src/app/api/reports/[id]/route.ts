import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const report = await prisma.report.findUnique({
    where: { id },
    include: { client: true },
  })
  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    ...report,
    topPages: report.topPages ? JSON.parse(report.topPages) : [],
    auditIssues: report.auditIssues ? JSON.parse(report.auditIssues) : [],
    tasks: report.tasks ? JSON.parse(report.tasks) : [],
    domainChanges: report.domainChanges ? JSON.parse(report.domainChanges) : [],
    aiRecommendations: report.aiRecommendations ? JSON.parse(report.aiRecommendations) : [],
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const report = await prisma.report.update({
    where: { id },
    data: {
      status: body.status,
      aiSummary: body.aiSummary,
      aiRecommendations: body.aiRecommendations ? JSON.stringify(body.aiRecommendations) : undefined,
    },
  })
  return NextResponse.json(report)
}

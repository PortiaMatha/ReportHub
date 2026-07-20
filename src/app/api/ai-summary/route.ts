import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateAISummary } from '@/lib/ai-summary'

export async function POST(req: NextRequest) {
  const { reportId } = await req.json()

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: { client: true },
  })
  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

  const reportForAI = {
    ...report,
    topPages: report.topPages ? JSON.parse(report.topPages) : [],
    domainChanges: report.domainChanges ? JSON.parse(report.domainChanges) : [],
  }

  const { summary, recommendations } = await generateAISummary(
    reportForAI as never,
    report.client.name,
    report.client.domain
  )

  await prisma.report.update({
    where: { id: reportId },
    data: {
      aiSummary: summary,
      aiRecommendations: JSON.stringify(recommendations),
    },
  })

  return NextResponse.json({ summary, recommendations })
}

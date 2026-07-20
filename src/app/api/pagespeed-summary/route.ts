import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generatePageSpeedAnalysis } from '@/lib/pagespeed-ai'

export async function POST(req: NextRequest) {
  const { reportId } = await req.json()

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: { client: true },
  })
  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

  const reportForAI = {
    ...report,
    githubCommits: report.githubCommits ? JSON.parse(report.githubCommits) : [],
    pagespeedOpportunities: report.pagespeedOpportunities ? JSON.parse(report.pagespeedOpportunities) : [],
    pagespeedCrux: report.pagespeedCrux ? JSON.parse(report.pagespeedCrux) : undefined,
  }

  const { summary, issues } = await generatePageSpeedAnalysis(
    reportForAI as never,
    report.client.name,
    report.client.domain
  )

  await prisma.report.update({
    where: { id: reportId },
    data: {
      pagespeedAiSummary: summary,
      pagespeedAiIssues: JSON.stringify(issues),
    },
  })

  return NextResponse.json({ summary, issues })
}

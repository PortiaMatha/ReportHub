import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get('clientId')
  const month = searchParams.get('month')
  const year = searchParams.get('year')

  const where: Record<string, unknown> = {}
  if (clientId) where.clientId = clientId
  const monthInt = parseInt(month ?? '')
  const yearInt = parseInt(year ?? '')
  if (!isNaN(monthInt)) where.month = monthInt
  if (!isNaN(yearInt)) where.year = yearInt

  const reports = await prisma.report.findMany({
    where,
    include: { client: true },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  })

  // Parse JSON fields
  const parsed = reports.map((r) => ({
    ...r,
    topPages: r.topPages ? JSON.parse(r.topPages) : [],
    dailySessions: r.dailySessions ? JSON.parse(r.dailySessions) : [],
    auditIssues: r.auditIssues ? JSON.parse(r.auditIssues) : [],
    tasks: r.tasks ? JSON.parse(r.tasks) : [],
    clickupStatusBreakdown: r.clickupStatusBreakdown ? JSON.parse(r.clickupStatusBreakdown) : [],
    githubReleases: r.githubReleases ? JSON.parse(r.githubReleases) : [],
    githubCommits: r.githubCommits ? JSON.parse(r.githubCommits) : [],
    domainChanges: r.domainChanges ? JSON.parse(r.domainChanges) : [],
    aiRecommendations: r.aiRecommendations ? JSON.parse(r.aiRecommendations) : [],
    pagespeedCrux: r.pagespeedCrux ? JSON.parse(r.pagespeedCrux) : undefined,
    pagespeedOpportunities: r.pagespeedOpportunities ? JSON.parse(r.pagespeedOpportunities) : [],
    pagespeedAiIssues: r.pagespeedAiIssues ? JSON.parse(r.pagespeedAiIssues) : [],
  }))

  return NextResponse.json(parsed)
}

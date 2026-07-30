import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchGA4Data } from '@/lib/integrations/ga4'
import { fetchPageSpeedData } from '@/lib/integrations/pagespeed'
import { fetchSEMrushData } from '@/lib/integrations/semrush'
import { fetchClickUpTasks } from '@/lib/integrations/clickup'
import { fetchSproutMonthlyData } from '@/lib/integrations/sproutsocial'
import { crawlDomain, diffDomainSnapshots } from '@/lib/integrations/domain'
import { fetchGitHubData } from '@/lib/integrations/github'
import { generateAISummary } from '@/lib/ai-summary'

export async function POST(req: NextRequest) {
  const { clientId, month, year, sources } = await req.json()

  const client = await prisma.client.findUnique({ where: { id: clientId } })
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  const results: Record<string, { success: boolean; error?: string }> = {}
  const reportData: Record<string, unknown> = {}

  // Run all enabled sources in parallel
  const tasks: Promise<void>[] = []

  // GA4
  if ((!sources || sources.includes('ga4')) && client.ga4PropertyId) {
    tasks.push(
      fetchGA4Data(client.ga4PropertyId, month, year)
        .then((data) => { Object.assign(reportData, data); results.ga4 = { success: true } })
        .catch((e) => { results.ga4 = { success: false, error: e.message } })
    )
  }

  // PageSpeed
  if (!sources || sources.includes('pagespeed')) {
    tasks.push(
      fetchPageSpeedData(client.domain)
        .then((data) => { Object.assign(reportData, data); results.pagespeed = { success: true } })
        .catch((e) => { results.pagespeed = { success: false, error: e.message } })
    )
  }

  // SEMrush
  if ((!sources || sources.includes('semrush')) && process.env.SEMRUSH_API_KEY) {
    tasks.push(
      fetchSEMrushData(client.domain, client.semrushProjectId || undefined)
        .then((data) => { Object.assign(reportData, data); results.semrush = { success: true } })
        .catch((e) => { results.semrush = { success: false, error: e.message } })
    )
  }

  // ClickUp
  if ((!sources || sources.includes('clickup')) && client.clickupListId) {
    tasks.push(
      fetchClickUpTasks(client.clickupListId)
        .then((data) => { Object.assign(reportData, data); results.clickup = { success: true } })
        .catch((e) => { results.clickup = { success: false, error: e.message } })
    )
  }

  // Sprout Social
  const sproutProfileIds: string[] = client.sproutProfileIds ? JSON.parse(client.sproutProfileIds) : []
  if ((!sources || sources.includes('sproutsocial')) && sproutProfileIds.length > 0) {
    tasks.push(
      fetchSproutMonthlyData(sproutProfileIds, month, year)
        .then((data) => { Object.assign(reportData, data); results.sproutsocial = { success: true } })
        .catch((e) => { results.sproutsocial = { success: false, error: e.message } })
    )
  }

  // GitHub
  if ((!sources || sources.includes('github')) && client.githubRepo) {
    tasks.push(
      fetchGitHubData(client.githubRepo, month, year)
        .then((data) => { Object.assign(reportData, data); results.github = { success: true } })
        .catch((e) => { results.github = { success: false, error: e.message } })
    )
  }

  // Domain crawl
  if (!sources || sources.includes('domain')) {
    tasks.push(
      crawlDomain(client.domain).then(async (snapshot) => {
        const changes = await diffDomainSnapshots(clientId, snapshot, month, year)
        reportData.domainChanges = changes

        // Save snapshot
        await prisma.domainSnapshot.upsert({
          where: { clientId_month_year: { clientId, month, year } },
          create: {
            clientId, month, year,
            shopifyVersion: snapshot.shopifyVersion as string,
            theme: snapshot.theme as string,
            themeVersion: snapshot.themeVersion as string,
            cms: snapshot.cms as string,
            techStack: JSON.stringify(snapshot.techStack || []),
            headers: JSON.stringify(snapshot.headers || {}),
          },
          update: {
            shopifyVersion: snapshot.shopifyVersion as string,
            theme: snapshot.theme as string,
            themeVersion: snapshot.themeVersion as string,
            cms: snapshot.cms as string,
            techStack: JSON.stringify(snapshot.techStack || []),
            headers: JSON.stringify(snapshot.headers || {}),
          },
        })
        results.domain = { success: true }
      }).catch((e) => { results.domain = { success: false, error: e.message } })
    )
  }

  await Promise.all(tasks)

  // Upsert report with collected data
  const report = await prisma.report.upsert({
    where: { clientId_month_year: { clientId, month, year } },
    create: {
      clientId, month, year, status: 'draft',
      ...serializeReport(reportData),
    },
    update: serializeReport(reportData),
  })

  // Generate AI summary if all key data is available
  if (!sources || sources.includes('ai')) {
    try {
      const reportForAI = {
        ...report,
        topPages: report.topPages ? JSON.parse(report.topPages) : [],
        domainChanges: report.domainChanges ? JSON.parse(report.domainChanges) : [],
      }
      const { summary, recommendations } = await generateAISummary(reportForAI as never, client.name, client.domain)
      await prisma.report.update({
        where: { id: report.id },
        data: {
          aiSummary: summary,
          aiRecommendations: JSON.stringify(recommendations),
        },
      })
      results.ai = { success: true }
    } catch (e: unknown) {
      results.ai = { success: false, error: (e as Error).message }
    }
  }

  return NextResponse.json({ success: true, reportId: report.id, results })
}

function serializeReport(data: Record<string, unknown>) {
  return {
    sessions: data.sessions as number,
    sessionsDelta: data.sessionsDelta as number,
    totalUsers: data.totalUsers as number,
    totalUsersDelta: data.totalUsersDelta as number,
    newUsers: data.newUsers as number,
    newUsersDelta: data.newUsersDelta as number,
    avgSessionDuration: data.avgSessionDuration as string,
    bounceRate: data.bounceRate as number,
    bounceRateDelta: data.bounceRateDelta as number,
    topPages: data.topPages ? JSON.stringify(data.topPages) : null,
    dailySessions: data.dailySessions ? JSON.stringify(data.dailySessions) : null,
    desktopPerf: data.desktopPerf as number,
    desktopAccess: data.desktopAccess as number,
    desktopBestPrac: data.desktopBestPrac as number,
    desktopSeo: data.desktopSeo as number,
    mobilePerf: data.mobilePerf as number,
    mobileAccess: data.mobileAccess as number,
    mobileBestPrac: data.mobileBestPrac as number,
    mobileSeo: data.mobileSeo as number,
    fcpDesktop: data.fcpDesktop as string,
    lcpDesktop: data.lcpDesktop as string,
    tbtDesktop: data.tbtDesktop as string,
    clsDesktop: data.clsDesktop as string,
    speedIndexDesktop: data.speedIndexDesktop as string,
    fcpMobile: data.fcpMobile as string,
    lcpMobile: data.lcpMobile as string,
    tbtMobile: data.tbtMobile as string,
    clsMobile: data.clsMobile as string,
    speedIndexMobile: data.speedIndexMobile as string,
    pagespeedCrux: data.pagespeedCrux ? JSON.stringify(data.pagespeedCrux) : null,
    pagespeedOpportunities: data.pagespeedOpportunities ? JSON.stringify(data.pagespeedOpportunities) : null,
    siteHealth: data.siteHealth as number,
    errors: data.errors as number,
    warnings: data.warnings as number,
    crawlability: data.crawlability as number,
    internalLinking: data.internalLinking as number,
    organicKeywords: data.organicKeywords as number,
    organicTraffic: data.organicTraffic as number,
    openTasks: data.openTasks as number,
    completedTasks: data.completedTasks as number,
    inProgressTasks: data.inProgressTasks as number,
    tasks: data.tasks ? JSON.stringify(data.tasks) : null,
    clickupStatusBreakdown: data.clickupStatusBreakdown ? JSON.stringify(data.clickupStatusBreakdown) : null,
    sproutImpressions: data.sproutImpressions as number,
    sproutImpressionsDelta: data.sproutImpressionsDelta as number,
    sproutEngagements: data.sproutEngagements as number,
    sproutEngagementsDelta: data.sproutEngagementsDelta as number,
    sproutFollowerGrowth: data.sproutFollowerGrowth as number,
    sproutVideoViews: data.sproutVideoViews as number,
    sproutSaves: data.sproutSaves as number,
    sproutShares: data.sproutShares as number,
    githubBranch: data.githubBranch as string,
    githubLastCommit: data.githubLastCommit as string,
    githubLastCommitMsg: data.githubLastCommitMsg as string,
    githubLastCommitDate: data.githubLastCommitDate as string,
    githubCommitsThisMonth: data.githubCommitsThisMonth as number,
    githubOpenPRs: data.githubOpenPRs as number,
    githubMergedPRs: data.githubMergedPRs as number,
    githubOpenIssues: data.githubOpenIssues as number,
    githubStars: data.githubStars as number,
    githubReleases: data.githubReleases ? JSON.stringify(data.githubReleases) : null,
    githubCommits: data.githubCommits ? JSON.stringify(data.githubCommits) : null,
    domainChanges: data.domainChanges ? JSON.stringify(data.domainChanges) : null,
  }
}

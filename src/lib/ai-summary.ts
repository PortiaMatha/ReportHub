import Anthropic from '@anthropic-ai/sdk'
import type { ReportData, AIRecommendation } from '@/types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function generateAISummary(report: ReportData, clientName: string, domain: string) {
  const monthName = new Date(report.year, report.month - 1).toLocaleString('en', { month: 'long' })

  const githubSection = report.githubBranch || report.githubCommitsThisMonth != null
    ? `
### GitHub Repository Activity
- Branch: ${report.githubBranch || 'N/A'}
- Commits this month: ${report.githubCommitsThisMonth ?? 'N/A'}
- Open PRs: ${report.githubOpenPRs ?? 'N/A'}
- Merged PRs: ${report.githubMergedPRs ?? 'N/A'}
- Open issues: ${report.githubOpenIssues ?? 'N/A'}
${Array.isArray(report.githubCommits) && report.githubCommits.length > 0
  ? `\nRecent commits (newest first):\n${report.githubCommits.slice(0, 10).map(c => `- [${c.author}] ${c.message}`).join('\n')}`
  : report.githubLastCommitMsg ? `- Last commit: [${report.githubBranch}] ${report.githubLastCommitMsg}` : ''}
`
    : ''

  const sproutSection = report.sproutImpressions != null
    ? `
### Sprout Social (combined across all connected platforms)
- Impressions: ${report.sproutImpressions.toLocaleString()} (${report.sproutImpressionsDelta !== undefined ? (report.sproutImpressionsDelta > 0 ? '+' : '') + report.sproutImpressionsDelta + '%' : 'N/A'} vs last month)
- Engagements: ${report.sproutEngagements?.toLocaleString() ?? 'N/A'} (${report.sproutEngagementsDelta !== undefined ? (report.sproutEngagementsDelta > 0 ? '+' : '') + report.sproutEngagementsDelta + '%' : 'N/A'})
- Net Follower Growth: ${report.sproutFollowerGrowth?.toLocaleString() ?? 'N/A'}
- Video Views: ${report.sproutVideoViews?.toLocaleString() ?? 'N/A'}
- Saves: ${report.sproutSaves?.toLocaleString() ?? 'N/A'}
- Shares: ${report.sproutShares?.toLocaleString() ?? 'N/A'}
`
    : ''

  const prompt = `You are a senior digital marketing analyst writing a monthly performance summary for a client report.

Client: ${clientName}
Website: ${domain}
Period: ${monthName} ${report.year}

## Data collected this month:

### Google Analytics 4
- Sessions: ${report.sessions?.toLocaleString() || 'N/A'} (${report.sessionsDelta !== undefined ? (report.sessionsDelta > 0 ? '+' : '') + report.sessionsDelta + '%' : 'N/A'} vs last month)
- Total Users: ${report.totalUsers?.toLocaleString() || 'N/A'} (${report.totalUsersDelta !== undefined ? (report.totalUsersDelta > 0 ? '+' : '') + report.totalUsersDelta + '%' : 'N/A'})
- New Users: ${report.newUsers?.toLocaleString() || 'N/A'} (${report.newUsersDelta !== undefined ? (report.newUsersDelta > 0 ? '+' : '') + report.newUsersDelta + '%' : 'N/A'})
- Avg Session Duration: ${report.avgSessionDuration || 'N/A'}
- Bounce Rate: ${report.bounceRate || 'N/A'}% (${report.bounceRateDelta !== undefined ? (report.bounceRateDelta > 0 ? '+' : '') + report.bounceRateDelta + '%' : 'N/A'})
- Top page: ${report.topPages?.[0]?.path || 'N/A'} (${report.topPages?.[0]?.sessions?.toLocaleString() || 'N/A'} sessions)

### PageSpeed Insights
- Desktop Performance: ${report.desktopPerf || 'N/A'}%
- Mobile Performance: ${report.mobilePerf || 'N/A'}%
- Desktop Accessibility: ${report.desktopAccess || 'N/A'}%
- Mobile Accessibility: ${report.mobileAccess || 'N/A'}%
- LCP Desktop: ${report.lcpDesktop || 'N/A'}
- LCP Mobile: ${report.lcpMobile || 'N/A'}

### SEMrush Site Audit
- Site Health: ${report.siteHealth || 'N/A'}%
- Errors: ${report.errors || 0}
- Warnings: ${report.warnings || 0}
- Crawlability: ${report.crawlability || 'N/A'}%
- Internal Linking: ${report.internalLinking || 'N/A'}%

### ClickUp Tasks
- Open: ${report.openTasks || 0}
- In Progress: ${report.inProgressTasks || 0}
- Completed: ${report.completedTasks || 0}
${sproutSection}${githubSection}
### Domain Changes vs Last Month
${report.domainChanges?.length ? report.domainChanges.map(c => `- ${c.label}: ${c.previous} → ${c.current}`).join('\n') : '- No changes detected'}

---

Write a professional monthly summary (3-4 paragraphs) covering: overall performance, what improved, what needs attention, and traffic trends. Be specific with numbers. Write for a non-technical client.${sproutSection ? ' In the traffic trends / outlook paragraph, fold in the Sprout Social findings alongside the website traffic trend — discuss impressions, engagement, and follower growth as part of the same growth-trajectory narrative, not as a separate afterthought.' : ''}${githubSection ? ' Where relevant, reference specific code changes (commits) that explain performance shifts — e.g. if performance improved, mention the work done by the team.' : ''}

Then provide exactly 4-6 prioritised recommendations as a JSON array at the end in this exact format:
<recommendations>
[
  {
    "category": "performance|seo|security|ux|content",
    "priority": "high|medium|low",
    "title": "Short action title",
    "description": "One sentence explaining what to do and why."
  }
]
</recommendations>`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  // Split summary from recommendations
  const recMatch = text.match(/<recommendations>([\s\S]+?)<\/recommendations>/)
  let recommendations: AIRecommendation[] = []
  let summary = text

  if (recMatch) {
    try {
      recommendations = JSON.parse(recMatch[1].trim())
    } catch { /* ignore parse errors */ }
    summary = text.replace(/<recommendations>[\s\S]+?<\/recommendations>/, '').trim()
  }

  return { summary, recommendations }
}

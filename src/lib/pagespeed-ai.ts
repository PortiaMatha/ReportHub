import Anthropic from '@anthropic-ai/sdk'
import type { ReportData, PageSpeedIssue } from '@/types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function generatePageSpeedAnalysis(report: ReportData, clientName: string, domain: string) {
  const opportunities = report.pagespeedOpportunities || []
  const crux = report.pagespeedCrux

  const commitFilesSection = Array.isArray(report.githubCommits) && report.githubCommits.length > 0
    ? `\n### Recent code changes this month (newest first)\n${report.githubCommits.slice(0, 20).map(c => `- ${c.message} — files: ${(c.files && c.files.length ? c.files.join(', ') : 'n/a')}`).join('\n')}`
    : ''

  const prompt = `You are a senior web performance engineer auditing ${clientName}'s website (${domain}) using Google PageSpeed Insights (Lighthouse lab data) and CrUX real-user field data.

## Lab scores (0-100)
- Desktop: Performance ${report.desktopPerf ?? 'N/A'}, Accessibility ${report.desktopAccess ?? 'N/A'}, Best Practices ${report.desktopBestPrac ?? 'N/A'}, SEO ${report.desktopSeo ?? 'N/A'}
- Mobile: Performance ${report.mobilePerf ?? 'N/A'}, Accessibility ${report.mobileAccess ?? 'N/A'}, Best Practices ${report.mobileBestPrac ?? 'N/A'}, SEO ${report.mobileSeo ?? 'N/A'}

## Core Web Vitals — lab data (Lighthouse, synthetic single run)
- Desktop — FCP: ${report.fcpDesktop ?? 'N/A'}, LCP: ${report.lcpDesktop ?? 'N/A'}, TBT: ${report.tbtDesktop ?? 'N/A'}, CLS: ${report.clsDesktop ?? 'N/A'}, Speed Index: ${report.speedIndexDesktop ?? 'N/A'}
- Mobile — FCP: ${report.fcpMobile ?? 'N/A'}, LCP: ${report.lcpMobile ?? 'N/A'}, TBT: ${report.tbtMobile ?? 'N/A'}, CLS: ${report.clsMobile ?? 'N/A'}, Speed Index: ${report.speedIndexMobile ?? 'N/A'}

## CrUX field data — real Chrome users, trailing 28 days
${crux ? JSON.stringify(crux, null, 2) : 'Not available for this domain (insufficient real-user traffic in the CrUX dataset).'}

## Lighthouse opportunities & diagnostics (issues detected)
${opportunities.length ? opportunities.map(o => `- [${o.strategy}/${o.category}] ${o.title}${o.displayValue ? ` (${o.displayValue})` : ''}: ${o.description}`).join('\n') : 'None flagged.'}
${commitFilesSection}

---

Write a technical but readable summary (2-3 paragraphs) covering: overall performance health, whether real-user (CrUX) experience matches or diverges from the lab data, and the biggest risks to fix. If a recent commit's changed files plausibly explain a flagged issue (e.g. a commit touching a slider/image/section file lines up with a CLS or image-weight issue), call that out specifically by file name — otherwise do not force a connection.

Then list exactly 4-8 concrete issues to fix as a JSON array at the end in this exact format:
<issues>
[
  {
    "title": "Short issue title",
    "description": "What's wrong and the specific fix to apply.",
    "severity": "high|medium|low",
    "relatedFile": "path/to/file.liquid or null if not traceable to a specific file"
  }
]
</issues>`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  const issuesMatch = text.match(/<issues>([\s\S]+?)<\/issues>/)
  let issues: PageSpeedIssue[] = []
  let summary = text

  if (issuesMatch) {
    try {
      issues = JSON.parse(issuesMatch[1].trim())
    } catch { /* ignore parse errors */ }
    summary = text.replace(/<issues>[\s\S]+?<\/issues>/, '').trim()
  }

  return { summary, issues }
}

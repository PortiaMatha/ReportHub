import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import puppeteer from 'puppeteer'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const report = await prisma.report.findUnique({
    where: { id },
    include: { client: true },
  })
  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const topPages = report.topPages ? JSON.parse(report.topPages) : []
  const tasks = report.tasks ? JSON.parse(report.tasks) : []
  const monthName = new Date(report.year, report.month - 1).toLocaleString('en', { month: 'long' })
  const clientName = report.client?.name ?? 'Client'

  const html = buildHTML({ report, topPages, tasks, monthName, clientName })

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'networkidle0' })
  const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '16mm', bottom: '16mm', left: '16mm', right: '16mm' } })
  await browser.close()

  const filename = `${clientName}-${monthName}-${report.year}-report.pdf`.replace(/\s+/g, '-')
  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

function score(v?: number | null) {
  if (!v) return '<span style="color:#94a3b8">—</span>'
  const color = v >= 90 ? '#22c55e' : v >= 70 ? '#f59e0b' : '#ef4444'
  return `<span style="color:${color};font-weight:600">${v}</span>`
}

function delta(v?: number | null) {
  if (!v || v === 0) return ''
  const color = v > 0 ? '#22c55e' : '#ef4444'
  const arrow = v > 0 ? '▲' : '▼'
  return `<span style="color:${color};font-size:11px;margin-left:4px">${arrow}${Math.abs(v)}%</span>`
}

function buildHTML({ report, topPages, tasks, monthName, clientName }: {
  report: { year: number; sessions?: number | null; sessionsDelta?: number | null; totalUsers?: number | null; totalUsersDelta?: number | null; newUsers?: number | null; newUsersDelta?: number | null; avgSessionDuration?: string | null; bounceRate?: number | null; bounceRateDelta?: number | null; desktopPerf?: number | null; mobilePerf?: number | null; desktopAccess?: number | null; mobileAccess?: number | null; desktopBestPrac?: number | null; mobileBestPrac?: number | null; desktopSeo?: number | null; mobileSeo?: number | null; fcpDesktop?: string | null; lcpDesktop?: string | null; fcpMobile?: string | null; lcpMobile?: string | null; siteHealth?: number | null; errors?: number | null; warnings?: number | null; crawlability?: number | null; internalLinking?: number | null; openTasks?: number | null; completedTasks?: number | null; inProgressTasks?: number | null; aiSummary?: string | null; client?: { domain?: string | null } | null }
  topPages: { path: string; sessions: number }[]
  tasks: { name: string; status: string }[]
  monthName: string
  clientName: string
}) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; background: #fff; font-size: 13px; line-height: 1.5; }
  .header { background: #1c2232; color: white; padding: 24px 28px; display: flex; justify-content: space-between; align-items: flex-end; }
  .header-title { font-size: 22px; font-weight: 700; }
  .header-sub { font-size: 13px; color: #94a3b8; margin-top: 2px; }
  .header-period { font-size: 13px; color: #94a3b8; text-align: right; }
  .header-period strong { display: block; font-size: 16px; color: #fff; }
  .content { padding: 20px 28px; }
  .summary-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
  .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; }
  .card-label { font-size: 11px; color: #64748b; font-weight: 500; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 4px; }
  .card-value { font-size: 22px; font-weight: 700; color: #0f172a; }
  .card-sub { font-size: 11px; color: #94a3b8; margin-top: 2px; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 13px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: .05em; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  table { width: 100%; border-collapse: collapse; }
  tr { border-bottom: 1px solid #f1f5f9; }
  tr:last-child { border-bottom: none; }
  td { padding: 6px 0; font-size: 12.5px; }
  td:first-child { color: #64748b; width: 55%; }
  td:last-child { text-align: right; font-weight: 600; color: #0f172a; }
  .bar-row { margin-bottom: 10px; }
  .bar-label { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; color: #475569; }
  .bar-track { height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 3px; }
  .task-row { display: flex; align-items: center; gap: 8px; padding: 5px 0; border-bottom: 1px solid #f1f5f9; font-size: 12.5px; }
  .task-row:last-child { border-bottom: none; }
  .task-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .task-name { flex: 1; color: #334155; }
  .badge { font-size: 10px; padding: 2px 8px; border-radius: 20px; font-weight: 600; }
  .badge-planning { background: #eff6ff; color: #3b82f6; }
  .badge-progress { background: #f5f3ff; color: #8b5cf6; }
  .badge-done { background: #f0fdf4; color: #22c55e; }
  .badge-error { background: #fef2f2; color: #ef4444; }
  .ai-summary { font-size: 12.5px; color: #334155; line-height: 1.7; white-space: pre-wrap; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; }
  .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="header-title">${clientName}</div>
    <div class="header-sub">${report.client?.domain ?? ''}</div>
  </div>
  <div class="header-period">
    <strong>${monthName} ${report.year}</strong>
    Monthly Report
  </div>
</div>

<div class="content">
  <!-- Summary cards -->
  <div class="summary-cards">
    <div class="card">
      <div class="card-label">Sessions</div>
      <div class="card-value">${report.sessions ? (report.sessions >= 1000 ? `${(report.sessions / 1000).toFixed(0)}K` : report.sessions) : '—'}</div>
      <div class="card-sub">GA4${report.sessionsDelta ? ` · ${report.sessionsDelta > 0 ? '+' : ''}${report.sessionsDelta}%` : ''}</div>
    </div>
    <div class="card">
      <div class="card-label">Desktop Perf</div>
      <div class="card-value">${report.desktopPerf ?? '—'}</div>
      <div class="card-sub">PageSpeed</div>
    </div>
    <div class="card">
      <div class="card-label">Site Health</div>
      <div class="card-value">${report.siteHealth ? `${report.siteHealth}%` : '—'}</div>
      <div class="card-sub">SEMrush</div>
    </div>
    <div class="card">
      <div class="card-label">Open Tasks</div>
      <div class="card-value">${report.openTasks ?? '—'}</div>
      <div class="card-sub">ClickUp</div>
    </div>
  </div>

  <div class="two-col">
    <!-- GA4 -->
    <div class="section">
      <div class="section-title">Google Analytics 4</div>
      <table>
        <tr><td>Sessions</td><td>${(report.sessions ?? 0).toLocaleString()}${delta(report.sessionsDelta)}</td></tr>
        <tr><td>Total users</td><td>${(report.totalUsers ?? 0).toLocaleString()}${delta(report.totalUsersDelta)}</td></tr>
        <tr><td>New users</td><td>${(report.newUsers ?? 0).toLocaleString()}${delta(report.newUsersDelta)}</td></tr>
        <tr><td>Avg session</td><td>${report.avgSessionDuration ?? '—'}</td></tr>
        <tr><td>Bounce rate</td><td>${report.bounceRate ? `${report.bounceRate}%` : '—'}${delta(report.bounceRateDelta ? -report.bounceRateDelta : undefined)}</td></tr>
      </table>
      ${topPages.length ? `
      <div style="margin-top:12px">
        <div style="font-size:11px;color:#64748b;font-weight:500;text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">Top pages</div>
        ${topPages.slice(0, 5).map((p: { path: string; sessions: number }, i: number) => `
          <div style="display:flex;gap:8px;font-size:12px;padding:3px 0;border-bottom:1px solid #f1f5f9">
            <span style="color:#8b5cf6;font-weight:600;width:14px">${i + 1}</span>
            <span style="flex:1;font-family:monospace;color:#475569;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.path}</span>
            <span style="font-weight:600;color:#0f172a">${p.sessions.toLocaleString()}</span>
          </div>`).join('')}
      </div>` : ''}
    </div>

    <!-- PageSpeed -->
    <div class="section">
      <div class="section-title">PageSpeed Insights</div>
      <div style="margin-bottom:10px">
        <div style="font-size:11px;color:#94a3b8;font-weight:500;margin-bottom:8px">DESKTOP</div>
        ${scoreBar('Performance', report.desktopPerf)}
        ${scoreBar('Accessibility', report.desktopAccess)}
        ${scoreBar('Best practices', report.desktopBestPrac)}
        ${scoreBar('SEO', report.desktopSeo)}
        ${report.fcpDesktop ? `<div style="font-size:11px;color:#94a3b8;margin-top:6px">FCP: <strong style="color:#475569">${report.fcpDesktop}</strong> &nbsp; LCP: <strong style="color:#475569">${report.lcpDesktop}</strong></div>` : ''}
      </div>
      <div style="margin-top:14px">
        <div style="font-size:11px;color:#94a3b8;font-weight:500;margin-bottom:8px">MOBILE</div>
        ${scoreBar('Performance', report.mobilePerf)}
        ${scoreBar('Accessibility', report.mobileAccess)}
        ${scoreBar('Best practices', report.mobileBestPrac)}
        ${scoreBar('SEO', report.mobileSeo)}
        ${report.fcpMobile ? `<div style="font-size:11px;color:#94a3b8;margin-top:6px">FCP: <strong style="color:#475569">${report.fcpMobile}</strong> &nbsp; LCP: <strong style="color:#475569">${report.lcpMobile}</strong></div>` : ''}
      </div>
    </div>
  </div>

  <div class="two-col">
    <!-- SEMrush -->
    <div class="section">
      <div class="section-title">SEMrush Site Audit</div>
      <table>
        <tr><td>Site health</td><td>${score(report.siteHealth)}${report.siteHealth ? '%' : ''}</td></tr>
        <tr><td>Errors</td><td style="color:${report.errors ? '#ef4444' : 'inherit'}">${report.errors ?? '—'}</td></tr>
        <tr><td>Warnings</td><td style="color:${report.warnings ? '#f59e0b' : 'inherit'}">${report.warnings?.toLocaleString() ?? '—'}</td></tr>
        <tr><td>Crawlability</td><td>${report.crawlability ? `${report.crawlability}%` : '—'}</td></tr>
        <tr><td>Internal linking</td><td>${report.internalLinking ? `${report.internalLinking}%` : '—'}</td></tr>
      </table>
    </div>

    <!-- ClickUp -->
    <div class="section">
      <div class="section-title">ClickUp Tasks</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:18px;font-weight:700;color:#0f172a">${report.openTasks ?? '—'}</div>
          <div style="font-size:11px;color:#94a3b8">Open</div>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:18px;font-weight:700;color:#8b5cf6">${report.inProgressTasks ?? '—'}</div>
          <div style="font-size:11px;color:#94a3b8">In progress</div>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:18px;font-weight:700;color:#22c55e">${report.completedTasks ?? '—'}</div>
          <div style="font-size:11px;color:#94a3b8">Completed</div>
        </div>
      </div>
      ${tasks.slice(0, 6).map((t: { name: string; status: string }) => {
    const s = t.status.toLowerCase()
    const dotColor = s.includes('done') || s.includes('complete') ? '#22c55e' : s.includes('progress') ? '#8b5cf6' : s.includes('error') ? '#ef4444' : '#94a3b8'
    const badgeCls = s.includes('done') || s.includes('complete') ? 'badge-done' : s.includes('progress') ? 'badge-progress' : s.includes('planning') ? 'badge-planning' : 'badge-error'
    return `<div class="task-row"><span class="task-dot" style="background:${dotColor}"></span><span class="task-name">${t.name}</span><span class="badge ${badgeCls}">${t.status}</span></div>`
  }).join('')}
    </div>
  </div>

  ${report.aiSummary ? `
  <div class="section">
    <div class="section-title">AI Summary</div>
    <div class="ai-summary">${report.aiSummary}</div>
  </div>` : ''}

  <div class="footer">
    <span>Generated by ReportHub</span>
    <span>${new Date().toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
  </div>
</div>
</body>
</html>`
}

function scoreBar(label: string, value?: number | null) {
  const pct = value ?? 0
  const color = pct >= 90 ? '#22c55e' : pct >= 70 ? '#f59e0b' : pct > 0 ? '#ef4444' : '#e2e8f0'
  const textColor = pct >= 90 ? '#22c55e' : pct >= 70 ? '#f59e0b' : pct > 0 ? '#ef4444' : '#94a3b8'
  return `
  <div class="bar-row">
    <div class="bar-label">
      <span>${label}</span>
      <span style="color:${textColor};font-weight:600">${value ?? '—'}</span>
    </div>
    <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
  </div>`
}

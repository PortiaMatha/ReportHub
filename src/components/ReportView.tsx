'use client'

import { useState, useEffect, useCallback } from 'react'
import React from 'react'
import {
  RefreshCw, Download, Sparkles, ArrowUp, ArrowDown, ExternalLink,
  CheckCircle, AlertTriangle, BarChart2, Zap, Search, CheckSquare,
  GitBranch, GitMerge, GitPullRequest, Star, AlertCircle, User,
} from 'lucide-react'
import type { Client, ReportData, AIRecommendation, TaskAssignee, GitHubRelease, GitHubCommit, ClickUpStatus, DailySession, CruxData, PageSpeedIssue } from '@/types'
import KpiView from './KpiView'

type Tab = 'overview' | 'ga4' | 'pagespeed' | 'semrush' | 'clickup' | 'github' | 'domain' | 'ai' | 'kpi'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'ga4', label: 'GA4' },
  { id: 'pagespeed', label: 'PageSpeed' },
  { id: 'semrush', label: 'SEMrush' },
  { id: 'clickup', label: 'ClickUp' },
  { id: 'github', label: 'GitHub' },
  { id: 'domain', label: 'Domain' },
  { id: 'ai', label: 'AI Summary' },
  { id: 'kpi', label: 'KPI' },
]

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function ReportView({ client }: { client: Client }) {
  const [month, setMonth] = useState<number>(() => new Date().getMonth() + 1)
  const [year, setYear] = useState<number>(() => new Date().getFullYear())
  const [report, setReport] = useState<ReportData | null>(null)
  const [allReports, setAllReports] = useState<ReportData[]>([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<Record<string, boolean>>({})
  const [regenAI, setRegenAI] = useState(false)
  const [regenPageSpeedAI, setRegenPageSpeedAI] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const monthName = new Date(year, month - 1).toLocaleString('en', { month: 'long' })

  const loadReport = useCallback(async () => {
    if (!month || !year || isNaN(month) || isNaN(year)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/reports?clientId=${client.id}&month=${month}&year=${year}`)
      const data = await res.json()
      setReport(data[0] || null)
    } finally {
      setLoading(false)
    }
  }, [client.id, month, year])

  const loadAllReports = useCallback(async () => {
    const res = await fetch(`/api/reports?clientId=${client.id}`)
    const data = await res.json()
    setAllReports(data)
  }, [client.id])

  useEffect(() => { loadReport() }, [loadReport])
  useEffect(() => { loadAllReports() }, [loadAllReports])
  useEffect(() => { setActiveTab('overview') }, [client.id])

  const handleSync = async () => {
    setSyncing(true)
    setSyncStatus({})
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, month: Number(month), year: Number(year) }),
      })
      let data: { results?: Record<string, { success: boolean }> } = {}
      try { data = await res.json() } catch { /* empty */ }
      setSyncStatus(Object.fromEntries(
        Object.entries(data.results || {}).map(([k, v]: [string, unknown]) => [k, (v as { success: boolean }).success])
      ))
      await loadReport()
      await loadAllReports()
    } finally {
      setSyncing(false)
    }
  }

  const handleRegenAI = async () => {
    if (!report) return
    setRegenAI(true)
    try {
      await fetch('/api/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: report.id }),
      })
      await loadReport()
    } finally {
      setRegenAI(false)
    }
  }

  const handleRegenPageSpeedAI = async () => {
    if (!report) return
    setRegenPageSpeedAI(true)
    try {
      await fetch('/api/pagespeed-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: report.id }),
      })
      await loadReport()
    } finally {
      setRegenPageSpeedAI(false)
    }
  }

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    return { label: d.toLocaleString('en', { month: 'long', year: 'numeric' }), month: d.getMonth() + 1, year: d.getFullYear() }
  })

  return (
    <div className="min-h-full flex flex-col">
      {/* Header */}
      <div className="px-8 pt-7 pb-0 border-b border-white/[0.06]">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-white">{client.name}</h1>
            <p className="text-sm text-slate-400 mt-1">
              {monthName} {year}
              {report?.updatedAt && <span className="ml-1">· last synced {timeAgo(report.updatedAt)}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1 mr-12">
            <select
              className="appearance-none text-sm bg-[#1c2232] border border-white/10 rounded-lg px-3 py-1.5 text-white focus:outline-none cursor-pointer"
              value={`${year}-${month}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split('-')
                setYear(Number(y))
                setMonth(Number(m))
              }}
            >
              {monthOptions.map((o, i) => (
                <option key={i} value={`${o.year}-${o.month}`}>{o.label}</option>
              ))}
            </select>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-1.5 text-sm border border-white/10 rounded-lg px-3.5 py-1.5 text-white hover:bg-white/5 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing…' : 'Sync'}
            </button>
            <a
              href={report ? `/api/reports/${report.id}/pdf` : '#'}
              download
              aria-disabled={!report}
              className={`flex items-center gap-1.5 text-sm border border-white/10 rounded-lg px-3.5 py-1.5 text-white hover:bg-white/5 transition-colors ${!report ? 'opacity-40 pointer-events-none' : ''}`}
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </a>
          </div>
        </div>

        {/* Sync status pills */}
        {Object.keys(syncStatus).length > 0 && (
          <div className="pb-3 flex gap-2 flex-wrap">
            {Object.entries(syncStatus).map(([source, ok]) => (
              <span key={source} className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 ${ok ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {ok ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                {source}
              </span>
            ))}
          </div>
        )}

        {/* Tab bar */}
        <div className="flex">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-purple-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-white/20'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'kpi' ? (
        <div className="p-8 pb-16">
          <KpiView client={client} />
        </div>
      ) : loading ? (
        <div className="p-8 space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-white/5 rounded-xl animate-pulse" />)}
        </div>
      ) : !report ? (
        <EmptyReport onSync={handleSync} syncing={syncing} />
      ) : (
        <div className="p-8 pb-16">
          {activeTab === 'overview' && <OverviewTab report={report} />}
          {activeTab === 'ga4' && <GA4Tab report={report} allReports={allReports} />}
          {activeTab === 'pagespeed' && <PageSpeedTab report={report} onRegen={handleRegenPageSpeedAI} regenAI={regenPageSpeedAI} />}
          {activeTab === 'semrush' && <SEMrushTab report={report} />}
          {activeTab === 'clickup' && <ClickUpTab report={report} />}
          {activeTab === 'github' && <GitHubTab report={report} />}
          {activeTab === 'domain' && <DomainTab report={report} />}
          {activeTab === 'ai' && <AITab report={report} onRegen={handleRegenAI} regenAI={regenAI} />}
        </div>
      )}
    </div>
  )
}

// ─── Tab panels ───────────────────────────────────────────────────────────────

function OverviewTab({ report }: { report: ReportData }) {
  const hasGitHub = report.githubCommitsThisMonth != null || !!report.githubBranch
  return (
    <div className="space-y-5">
      <div className={`grid gap-3 ${hasGitHub ? 'grid-cols-5' : 'grid-cols-4'}`}>
        <SourceCard icon={<BarChart2 className="w-4 h-4" />} name="GA4" value={report.sessions ? (report.sessions >= 1000 ? `${(report.sessions / 1000).toFixed(0)}K` : String(report.sessions)) : '—'} label="Sessions" delta={report.sessionsDelta} ok={!!report.sessions} />
        <SourceCard icon={<Zap className="w-4 h-4" />} name="PageSpeed" value={report.desktopPerf ? String(report.desktopPerf) : '—'} label="Desktop perf" ok={!!report.desktopPerf} />
        <SourceCard icon={<Search className="w-4 h-4" />} name="SEMrush" value={report.siteHealth ? `${report.siteHealth}%` : '—'} label="Site health" ok={!!(report.siteHealth || report.organicKeywords)} />
        <SourceCard icon={<CheckSquare className="w-4 h-4" />} name="ClickUp" value={report.openTasks !== undefined ? String(report.openTasks) : '—'} label="Open tasks" ok={report.openTasks !== undefined} />
        {hasGitHub && (
          <SourceCard icon={<GitBranch className="w-4 h-4" />} name="GitHub" value={report.githubCommitsThisMonth !== undefined ? String(report.githubCommitsThisMonth) : '—'} label="Commits" ok={hasGitHub} />
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-4">
          <GA4Card report={report} />
          <SEMrushCard report={report} />
        </div>
        <div className="space-y-4">
          <PageSpeedCard report={report} />
          <ClickUpCard report={report} />
        </div>
      </div>
      {hasGitHub && <GitHubCard report={report} />}
    </div>
  )
}

function GA4Tab({ report, allReports }: { report: ReportData; allReports: ReportData[] }) {
  // Daily chart — fill every day of the selected month, defaulting missing days to 0
  const daysInMonth = new Date(report.year, report.month, 0).getDate()
  const dailyMap = new Map<string, number>()
  if (Array.isArray(report.dailySessions)) {
    for (const d of report.dailySessions as DailySession[]) {
      dailyMap.set(d.date, d.sessions)
    }
  }
  const dailyData = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1
    const key = `${report.year}${String(report.month).padStart(2, '0')}${String(day).padStart(2, '0')}`
    return { day, sessions: dailyMap.get(key) ?? 0 }
  })
  const maxDaily = Math.max(...dailyData.map(d => d.sessions), 1)
  const hasDailyData = dailyData.some(d => d.sessions > 0)

  // Monthly chart — all 12 months of the selected year
  const monthlyMap = new Map<number, number>()
  for (const r of allReports) {
    if (r.year === report.year) monthlyMap.set(r.month, r.sessions || 0)
  }
  const yearlyData = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    sessions: monthlyMap.get(i + 1) ?? 0,
  }))
  const maxMonthly = Math.max(...yearlyData.map(d => d.sessions), 1)

  return (
    <div className="grid grid-cols-[1fr_260px] gap-6">
      <div className="space-y-5">
        {/* Daily breakdown for selected month */}
        <Card title={`Sessions by day — ${new Date(report.year, report.month - 1).toLocaleString('en', { month: 'long' })} ${report.year}`}>
          {hasDailyData ? (
            <div className="flex items-end gap-px mt-3" style={{ height: '148px' }}>
              {dailyData.map(({ day, sessions }) => {
                const pct = (sessions / maxDaily) * 100
                const isWeekend = [0, 6].includes(new Date(report.year, report.month - 1, day).getDay())
                return (
                  <div key={day} className="flex-1 flex flex-col items-center gap-1 min-w-0 group relative">
                    <div className="w-full flex items-end" style={{ height: '120px' }}>
                      <div
                        className={`w-full rounded-sm transition-all ${sessions === 0 ? 'bg-white/[0.03]' : isWeekend ? 'bg-purple-400/60 group-hover:bg-purple-400' : 'bg-purple-500 group-hover:bg-purple-400'}`}
                        style={{ height: `${Math.max(pct, sessions > 0 ? 3 : 1)}%` }}
                      />
                    </div>
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-[#1c2232] border border-white/10 rounded px-1.5 py-1 text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                      <span className="font-semibold">{sessions.toLocaleString()}</span> · {day} {MONTH_NAMES[report.month - 1]}
                    </div>
                    {/* Show day label every 5 days */}
                    <span className="text-[8px] text-slate-600 w-full text-center leading-none">
                      {day % 5 === 0 || day === 1 ? day : ''}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-6 text-center">No daily data — sync to populate</p>
          )}
        </Card>

        {/* Monthly trend for full year */}
        <Card title={`Monthly trend — ${report.year}`}>
          <div className="flex items-end gap-1.5 mt-3" style={{ height: '100px' }}>
            {yearlyData.map(({ month, sessions }) => {
              const pct = (sessions / maxMonthly) * 100
              const isActive = month === report.month
              return (
                <div key={month} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                  <div className="w-full flex items-end" style={{ height: '76px' }}>
                    <div
                      className={`w-full rounded-sm transition-all ${sessions === 0 ? 'bg-white/[0.03]' : isActive ? 'bg-purple-500' : 'bg-white/[0.1] hover:bg-white/[0.18]'}`}
                      style={{ height: `${Math.max(pct, sessions > 0 ? 4 : 1)}%` }}
                    />
                  </div>
                  <span className={`text-[9px] truncate w-full text-center ${isActive ? 'text-purple-400 font-semibold' : 'text-slate-600'}`}>
                    {MONTH_NAMES[month - 1]}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>

        {report.topPages?.length ? (
          <Card title="Top pages">
            <div className="space-y-2 mt-1">
              {report.topPages.map((p, i) => {
                const pct = (p.sessions / (report.topPages![0].sessions || 1)) * 100
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-4 h-4 rounded-full bg-purple-600/20 text-purple-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0">{i + 1}</span>
                    <span className="flex-1 font-mono text-xs text-slate-400 truncate">{p.path}</span>
                    <div className="w-24 h-1.5 bg-white/[0.06] rounded-full overflow-hidden flex-shrink-0">
                      <div className="h-full bg-purple-500/50 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-slate-300 font-semibold w-12 text-right">{p.sessions.toLocaleString()}</span>
                  </div>
                )
              })}
            </div>
          </Card>
        ) : null}
      </div>

      <Card title="Key metrics">
        <div className="space-y-3.5 mt-1">
          <DataRow label="Sessions" value={report.sessions?.toLocaleString()} delta={report.sessionsDelta} />
          <DataRow label="Users" value={report.totalUsers?.toLocaleString()} delta={report.totalUsersDelta} />
          <DataRow label="New users" value={report.newUsers?.toLocaleString()} delta={report.newUsersDelta} />
          <DataRow label="Bounce rate" value={report.bounceRate ? `${report.bounceRate}%` : undefined} delta={report.bounceRateDelta} invertDelta />
          <DataRow label="Avg session" value={report.avgSessionDuration} />
        </div>
      </Card>
    </div>
  )
}

function PageSpeedTab({ report, onRegen, regenAI }: { report: ReportData; onRegen: () => void; regenAI: boolean }) {
  const hasCrux = !!(report.pagespeedCrux?.desktop || report.pagespeedCrux?.mobile)

  return (
    <div className="space-y-5">
      {/* AI performance analysis */}
      <Card
        title="AI Performance Analysis"
        icon={<Sparkles className="w-3.5 h-3.5" />}
        action={
          <button
            onClick={onRegen}
            disabled={regenAI}
            className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 border border-purple-500/30 rounded-lg px-2.5 py-1 bg-purple-600/10 disabled:opacity-50 transition-colors"
          >
            <Sparkles className={`w-3 h-3 ${regenAI ? 'animate-spin' : ''}`} />
            {regenAI ? 'Analyzing…' : report.pagespeedAiSummary ? 'Regenerate' : 'Generate analysis'}
          </button>
        }
      >
        {report.pagespeedAiSummary ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{report.pagespeedAiSummary}</p>
            {report.pagespeedAiIssues?.length ? (
              <div>
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">What needs fixing</div>
                <div className="space-y-2">
                  {report.pagespeedAiIssues.map((issue, i) => <PageSpeedIssueCard key={i} issue={issue} />)}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-slate-500 text-center py-8">
            No analysis yet. Click Generate analysis to have AI review the live PageSpeed and GitHub data and flag what needs fixing.
          </p>
        )}
      </Card>

      {/* Desktop / Mobile detail */}
      <div className="grid grid-cols-2 gap-6">
        <Card title="Desktop">
          <div className="space-y-3 mt-2">
            <ScoreBar label="Performance" value={report.desktopPerf} />
            <ScoreBar label="Accessibility" value={report.desktopAccess} />
            <ScoreBar label="Best practices" value={report.desktopBestPrac} />
            <ScoreBar label="SEO" value={report.desktopSeo} />
          </div>
          <MetricGrid fcp={report.fcpDesktop} lcp={report.lcpDesktop} tbt={report.tbtDesktop} cls={report.clsDesktop} speedIndex={report.speedIndexDesktop} />
        </Card>
        <Card title="Mobile">
          <div className="space-y-3 mt-2">
            <ScoreBar label="Performance" value={report.mobilePerf} />
            <ScoreBar label="Accessibility" value={report.mobileAccess} />
            <ScoreBar label="Best practices" value={report.mobileBestPrac} />
            <ScoreBar label="SEO" value={report.mobileSeo} />
          </div>
          <MetricGrid fcp={report.fcpMobile} lcp={report.lcpMobile} tbt={report.tbtMobile} cls={report.clsMobile} speedIndex={report.speedIndexMobile} />
        </Card>
      </div>

      {/* CrUX real-user field data */}
      {hasCrux && (
        <Card title="Real user experience (CrUX field data)" icon={<User className="w-3.5 h-3.5" />}>
          <div className="grid grid-cols-2 gap-6 mt-1">
            <CruxColumn label="Desktop" data={report.pagespeedCrux?.desktop} />
            <CruxColumn label="Mobile" data={report.pagespeedCrux?.mobile} />
          </div>
        </Card>
      )}

      {/* Raw Lighthouse issues */}
      {report.pagespeedOpportunities?.length ? (
        <Card title="Issues detected (Lighthouse)" icon={<AlertCircle className="w-3.5 h-3.5" />}>
          <div className="space-y-0 mt-1">
            {report.pagespeedOpportunities.map((o, i) => (
              <div key={i} className="flex items-start gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
                <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold flex-shrink-0 mt-0.5 ${o.strategy === 'mobile' ? 'bg-sky-500/10 text-sky-400' : 'bg-purple-500/10 text-purple-400'}`}>
                  {o.strategy}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200">
                    {o.title}
                    {o.displayValue && <span className="text-slate-500"> — {o.displayValue}</span>}
                  </p>
                  {o.description && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{o.description}</p>}
                </div>
                <CategoryPill category={o.category} />
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  )
}

function MetricGrid({ fcp, lcp, tbt, cls, speedIndex }: { fcp?: string; lcp?: string; tbt?: string; cls?: string; speedIndex?: string }) {
  const metrics = [
    { label: 'FCP', value: fcp },
    { label: 'LCP', value: lcp },
    { label: 'TBT', value: tbt },
    { label: 'CLS', value: cls },
    { label: 'Speed Index', value: speedIndex },
  ]
  if (!metrics.some(m => m.value)) return null
  return (
    <div className="mt-4 grid grid-cols-3 gap-x-4 gap-y-2 text-xs text-slate-500">
      {metrics.map(m => (
        <span key={m.label}>{m.label}: <strong className="text-slate-300">{m.value || '—'}</strong></span>
      ))}
    </div>
  )
}

function cruxCategoryStyle(category: 'FAST' | 'AVERAGE' | 'SLOW') {
  if (category === 'FAST') return { label: 'Good', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' }
  if (category === 'AVERAGE') return { label: 'Needs improvement', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' }
  return { label: 'Poor', cls: 'bg-red-500/10 text-red-400 border-red-500/20' }
}

function CruxColumn({ label, data }: { label: string; data?: CruxData }) {
  const rows: { label: string; metric?: { value: number; category: 'FAST' | 'AVERAGE' | 'SLOW' }; unit: string; digits?: number }[] = [
    { label: 'FCP', metric: data?.fcp, unit: 'ms' },
    { label: 'LCP', metric: data?.lcp, unit: 'ms' },
    { label: 'CLS', metric: data?.cls, unit: '', digits: 2 },
    { label: 'INP', metric: data?.inp, unit: 'ms' },
    { label: 'TTFB', metric: data?.ttfb, unit: 'ms' },
  ]
  if (!data) {
    return (
      <div>
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">{label}</div>
        <p className="text-xs text-slate-600">No field data — not enough real-user traffic in CrUX.</p>
      </div>
    )
  }
  return (
    <div>
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">{label}</div>
      <div className="space-y-2">
        {rows.filter(r => r.metric).map(r => {
          const style = cruxCategoryStyle(r.metric!.category)
          return (
            <div key={r.label} className="flex items-center justify-between text-sm">
              <span className="text-slate-400">{r.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-300 font-medium">{r.digits ? r.metric!.value.toFixed(r.digits) : Math.round(r.metric!.value)}{r.unit}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${style.cls}`}>{style.label}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CategoryPill({ category }: { category: 'performance' | 'accessibility' | 'best-practices' | 'seo' }) {
  const cls = category === 'performance' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
    category === 'seo' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
    category === 'accessibility' ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' :
    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize border flex-shrink-0 ${cls}`}>{category}</span>
  )
}

function PageSpeedIssueCard({ issue }: { issue: PageSpeedIssue }) {
  const severityCls = issue.severity === 'high' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
    issue.severity === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
    'bg-white/5 text-slate-400 border-white/10'
  return (
    <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.05]">
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize border ${severityCls}`}>{issue.severity} severity</span>
        {issue.relatedFile && (
          <code className="text-[10px] font-mono text-slate-400 bg-white/[0.04] px-1.5 py-0.5 rounded truncate max-w-[260px]">{issue.relatedFile}</code>
        )}
      </div>
      <div className="text-sm font-medium text-white mb-0.5">{issue.title}</div>
      <div className="text-xs text-slate-400 leading-relaxed">{issue.description}</div>
    </div>
  )
}

function SEMrushTab({ report }: { report: ReportData }) {
  return (
    <div className="grid grid-cols-2 gap-6">
      <Card title="Site audit">
        <div className="space-y-3 mt-2">
          <DataRow label="Site health" value={report.siteHealth ? `${report.siteHealth}%` : undefined} />
          <DataRow label="Errors" value={report.errors?.toString()} danger={!!report.errors && report.errors > 0} />
          <DataRow label="Warnings" value={report.warnings?.toLocaleString()} warn={!!report.warnings && report.warnings > 0} />
          <DataRow label="Crawlability" value={report.crawlability ? `${report.crawlability}%` : undefined} />
          <DataRow label="Internal linking" value={report.internalLinking ? `${report.internalLinking}%` : undefined} />
        </div>
      </Card>
      <Card title="Organic search">
        <div className="space-y-3 mt-2">
          <DataRow label="Organic keywords" value={report.organicKeywords?.toLocaleString()} />
          <DataRow label="Organic traffic" value={report.organicTraffic?.toLocaleString()} />
        </div>
      </Card>
    </div>
  )
}

function ClickUpTab({ report }: { report: ReportData }) {
  const breakdown = Array.isArray(report.clickupStatusBreakdown) && report.clickupStatusBreakdown.length > 0
    ? report.clickupStatusBreakdown
    : null

  const cols = breakdown ? Math.min(breakdown.length, 5) : 3

  return (
    <div className="space-y-5">
      {breakdown ? (
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {breakdown.map((s) => (
            <StatusTile key={s.status} status={s.status} count={s.count} color={s.color} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <TaskCount label="Open" value={report.openTasks} color="text-white" />
          <TaskCount label="In progress" value={report.inProgressTasks} color="text-purple-400" />
          <TaskCount label="Completed" value={report.completedTasks} color="text-emerald-400" />
        </div>
      )}
      {report.tasks?.length ? (
        <Card title="Tasks">
          <div className="space-y-1 mt-1">
            {report.tasks.map((t) => (
              <div key={t.id} className="flex items-center gap-2.5 py-2 border-b border-white/[0.04] last:border-0">
                <TaskDot status={t.status} statusColor={t.statusColor} />
                <span className="flex-1 text-sm text-slate-300 truncate">{t.name}</span>
                {t.assignees && t.assignees.length > 0 && <AssigneeAvatars assignees={t.assignees} />}
                <TaskBadge status={t.status} statusColor={t.statusColor} />
                {t.url && (
                  <a href={t.url} target="_blank" rel="noreferrer" className="text-slate-600 hover:text-purple-400 transition-colors flex-shrink-0">
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  )
}

function GitHubTab({ report }: { report: ReportData }) {
  const noData = !report.githubBranch && report.githubCommitsThisMonth == null
  if (noData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <GitBranch className="w-10 h-10 text-slate-600 mb-3" />
        <p className="text-slate-400 text-sm font-medium">No GitHub data</p>
        <p className="text-slate-600 text-xs mt-1">Add a GitHub repo to the client and sync to populate this tab.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-3">
        <StatTile icon={<GitBranch className="w-4 h-4 text-purple-400" />} label="Commits this month" value={report.githubCommitsThisMonth ?? '—'} />
        <StatTile icon={<GitPullRequest className="w-4 h-4 text-sky-400" />} label="Open PRs" value={report.githubOpenPRs ?? '—'} />
        <StatTile icon={<GitMerge className="w-4 h-4 text-emerald-400" />} label="Merged PRs" value={report.githubMergedPRs ?? '—'} />
        <StatTile icon={<AlertCircle className="w-4 h-4 text-amber-400" />} label="Open issues" value={report.githubOpenIssues ?? '—'} />
      </div>

      <div className="grid grid-cols-[1fr_260px] gap-5">
        {/* Commit list */}
        <Card title="Commits this month" icon={<GitBranch className="w-3.5 h-3.5" />}>
          {Array.isArray(report.githubCommits) && report.githubCommits.length > 0 ? (
            <div className="space-y-0 mt-1">
              {report.githubCommits.map((c: GitHubCommit) => (
                <div key={c.sha} className="flex items-start gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
                  <code className="text-[11px] font-mono text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">
                    {c.sha}
                  </code>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate leading-snug">{c.message}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <User className="w-3 h-3 text-slate-500 flex-shrink-0" />
                      <span className="text-xs text-slate-300 font-medium">{c.author}</span>
                      <span className="text-slate-700">·</span>
                      <span className="text-xs text-slate-500">
                        {new Date(c.date).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' '}
                        {new Date(c.date).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                    {Array.isArray(c.files) && c.files.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {c.files.map(f => (
                          <code key={f} className="text-[10px] font-mono text-slate-400 bg-white/[0.04] px-1.5 py-0.5 rounded truncate max-w-[220px]">
                            {f}
                          </code>
                        ))}
                        {c.filesTruncated && (
                          <span className="text-[10px] text-slate-600 px-1 py-0.5">+more</span>
                        )}
                      </div>
                    )}
                  </div>
                  <a href={c.url} target="_blank" rel="noreferrer" className="text-slate-600 hover:text-purple-400 transition-colors flex-shrink-0 mt-1">
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-6 text-center">No commits recorded — re-sync to populate</p>
          )}
        </Card>

        {/* Right column: repo info + releases */}
        <div className="space-y-5">
          <Card title="Repository">
            <div className="space-y-3 mt-1">
              <DataRow label="Default branch" value={report.githubBranch} />
              <DataRow label="Stars" value={report.githubStars !== undefined ? `${report.githubStars} ★` : undefined} />
              {report.githubLastCommit && (
                <div className="flex items-start gap-2 pt-1">
                  <span className="text-xs text-slate-500 w-24 flex-shrink-0 mt-0.5">Last commit</span>
                  <div className="flex-1 min-w-0">
                    <code className="text-xs font-mono text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                      {report.githubLastCommit}
                    </code>
                    {report.githubLastCommitMsg && (
                      <p className="text-xs text-slate-300 mt-1 truncate">{report.githubLastCommitMsg}</p>
                    )}
                    {report.githubLastCommitDate && (
                      <p className="text-xs text-slate-600 mt-0.5">
                        {new Date(report.githubLastCommitDate).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {Array.isArray(report.githubReleases) && report.githubReleases.length > 0 && (
            <Card title="Recent releases">
              <div className="space-y-1 mt-1">
                {report.githubReleases.map((r: GitHubRelease) => (
                  <div key={r.tag} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
                    <Star className="w-3 h-3 text-amber-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <a href={r.url} target="_blank" rel="noreferrer" className="text-sm text-slate-200 hover:text-purple-400 transition-colors truncate block">
                        {r.name}
                      </a>
                      <span className="text-xs text-slate-600">
                        {new Date(r.date).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <code className="text-xs font-mono text-slate-500">{r.tag}</code>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-slate-500">{label}</span></div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  )
}

function DomainTab({ report }: { report: ReportData }) {
  if (!report.domainChanges?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-slate-500 text-sm">No domain changes recorded for this period.</p>
      </div>
    )
  }
  return (
    <Card title="Domain changes vs last month">
      <div className="space-y-1 mt-1">
        {report.domainChanges.map((c, i) => (
          <div key={i} className="flex items-center gap-4 text-sm py-2.5 border-b border-white/[0.05] last:border-0">
            <span className="text-slate-500 w-36 flex-shrink-0">{c.label}</span>
            <span className="text-slate-600 line-through text-xs">{c.previous}</span>
            <span className="text-slate-500">→</span>
            <span className={`font-medium ${c.type === 'improvement' ? 'text-emerald-400' : c.type === 'regression' ? 'text-red-400' : 'text-slate-300'}`}>
              {c.current}
            </span>
            <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
              c.type === 'improvement' ? 'bg-emerald-500/10 text-emerald-400' :
              c.type === 'regression' ? 'bg-red-500/10 text-red-400' :
              'bg-white/5 text-slate-400'
            }`}>{c.type}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

function AITab({ report, onRegen, regenAI }: { report: ReportData; onRegen: () => void; regenAI: boolean }) {
  return (
    <Card
      title="AI Summary & Recommendations"
      action={
        <button
          onClick={onRegen}
          disabled={regenAI}
          className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 border border-purple-500/30 rounded-lg px-2.5 py-1 bg-purple-600/10 disabled:opacity-50 transition-colors"
        >
          <Sparkles className={`w-3 h-3 ${regenAI ? 'animate-spin' : ''}`} />
          {regenAI ? 'Regenerating…' : 'Regenerate'}
        </button>
      }
    >
      {report.aiSummary ? (
        <div className="space-y-5">
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{report.aiSummary}</p>
          {report.aiRecommendations?.length ? (
            <div>
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Recommendations</div>
              <div className="grid grid-cols-2 gap-3">
                {report.aiRecommendations.map((rec: AIRecommendation, i: number) => <RecommendationCard key={i} rec={rec} />)}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="text-sm text-slate-500 text-center py-10">
          No AI summary yet. Click Regenerate to generate one.
        </div>
      )}
    </Card>
  )
}

// ─── Shared sub-components for Overview tab ───────────────────────────────────

function GA4Card({ report }: { report: ReportData }) {
  return (
    <Card title="GA4 — traffic" icon={<BarChart2 className="w-3.5 h-3.5" />}>
      <div className="space-y-3">
        <DataRow label="Sessions" value={report.sessions?.toLocaleString()} delta={report.sessionsDelta} />
        <DataRow label="Total users" value={report.totalUsers?.toLocaleString()} delta={report.totalUsersDelta} />
        <DataRow label="New users" value={report.newUsers?.toLocaleString()} delta={report.newUsersDelta} />
        <DataRow label="Avg session" value={report.avgSessionDuration} />
        <DataRow label="Bounce rate" value={report.bounceRate ? `${report.bounceRate}%` : undefined} delta={report.bounceRateDelta} invertDelta />
      </div>
      {report.topPages?.length ? (
        <div className="mt-4 pt-4 border-t border-white/[0.05]">
          <div className="text-xs font-medium text-slate-500 mb-2.5">Top pages</div>
          <div className="space-y-1.5">
            {report.topPages.slice(0, 5).map((p, i) => (
              <div key={i} className="flex items-center gap-2.5 text-xs">
                <span className="w-4 h-4 rounded-full bg-purple-600/20 text-purple-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0">{i + 1}</span>
                <span className="flex-1 font-mono text-slate-400 truncate">{p.path}</span>
                <span className="text-slate-300 font-semibold">{p.sessions.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </Card>
  )
}

function SEMrushCard({ report }: { report: ReportData }) {
  return (
    <Card title="SEMrush site audit" icon={<Search className="w-3.5 h-3.5" />}>
      <div className="space-y-3">
        <DataRow label="Site health" value={report.siteHealth ? `${report.siteHealth}%` : undefined} />
        <DataRow label="Errors" value={report.errors?.toString()} danger={!!report.errors && report.errors > 0} />
        <DataRow label="Warnings" value={report.warnings?.toLocaleString()} warn={!!report.warnings && report.warnings > 0} />
        <DataRow label="Crawlability" value={report.crawlability ? `${report.crawlability}%` : undefined} />
        <DataRow label="Int. linking" value={report.internalLinking ? `${report.internalLinking}%` : undefined} />
      </div>
    </Card>
  )
}

function PageSpeedCard({ report }: { report: ReportData }) {
  return (
    <Card title="PageSpeed scores" icon={<Zap className="w-3.5 h-3.5" />}>
      <div className="space-y-4">
        <div>
          <div className="text-[11px] font-medium text-slate-500 mb-3 uppercase tracking-wide">Desktop</div>
          <div className="space-y-3">
            <ScoreBar label="Performance" value={report.desktopPerf} />
            <ScoreBar label="Accessibility" value={report.desktopAccess} />
            <ScoreBar label="Best practices" value={report.desktopBestPrac} />
            <ScoreBar label="SEO" value={report.desktopSeo} />
          </div>
        </div>
        <div className="border-t border-white/[0.05] pt-4">
          <div className="text-[11px] font-medium text-slate-500 mb-3 uppercase tracking-wide">Mobile</div>
          <div className="space-y-3">
            <ScoreBar label="Performance" value={report.mobilePerf} />
            <ScoreBar label="Accessibility" value={report.mobileAccess} />
            <ScoreBar label="Best practices" value={report.mobileBestPrac} />
            <ScoreBar label="SEO" value={report.mobileSeo} />
          </div>
        </div>
      </div>
    </Card>
  )
}

function ClickUpCard({ report }: { report: ReportData }) {
  const breakdown = Array.isArray(report.clickupStatusBreakdown) && report.clickupStatusBreakdown.length > 0
    ? report.clickupStatusBreakdown
    : null

  return (
    <Card title="ClickUp tasks" icon={<CheckSquare className="w-3.5 h-3.5" />}>
      {breakdown ? (
        <div className="flex flex-wrap gap-2 mb-4">
          {breakdown.map((s: ClickUpStatus) => (
            <div key={s.status} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border" style={{ backgroundColor: s.color + '15', borderColor: s.color + '35' }}>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-xs text-slate-300 capitalize">{s.status}</span>
              <span className="text-xs font-bold text-white ml-0.5">{s.count}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-3 mb-4">
          <TaskCount label="Open" value={report.openTasks} color="text-white" />
          <TaskCount label="In progress" value={report.inProgressTasks} color="text-purple-400" />
          <TaskCount label="Completed" value={report.completedTasks} color="text-emerald-400" />
        </div>
      )}
      {report.tasks?.length ? (
        <div className="space-y-1.5 border-t border-white/[0.05] pt-3">
          {report.tasks.slice(0, 4).map((t) => (
            <div key={t.id} className="flex items-center gap-2.5 py-1">
              <TaskDot status={t.status} statusColor={t.statusColor} />
              <span className="flex-1 text-sm text-slate-300 truncate">{t.name}</span>
              <TaskBadge status={t.status} statusColor={t.statusColor} />
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  )
}

function GitHubCard({ report }: { report: ReportData }) {
  return (
    <Card title="GitHub activity" icon={<GitBranch className="w-3.5 h-3.5" />}>
      <div className="flex gap-3 mb-4">
        <TaskCount label="Commits" value={report.githubCommitsThisMonth} color="text-purple-400" />
        <TaskCount label="Open PRs" value={report.githubOpenPRs} color="text-sky-400" />
        <TaskCount label="Merged PRs" value={report.githubMergedPRs} color="text-emerald-400" />
        <TaskCount label="Issues" value={report.githubOpenIssues} color="text-amber-400" />
      </div>
      {Array.isArray(report.githubCommits) && report.githubCommits.length > 0 ? (
        <div className="space-y-0 border-t border-white/[0.05] pt-3">
          {report.githubCommits.slice(0, 5).map((c: GitHubCommit) => (
            <div key={c.sha} className="flex items-start gap-2.5 py-2">
              <code className="text-[11px] font-mono text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">
                {c.sha}
              </code>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-300 truncate">{c.message}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1"><User className="w-2.5 h-2.5" />{c.author} · {new Date(c.date).toLocaleDateString('en', { day: 'numeric', month: 'short' })}</p>
              </div>
            </div>
          ))}
        </div>
      ) : report.githubLastCommit ? (
        <div className="border-t border-white/[0.05] pt-3">
          <div className="flex items-center gap-2.5">
            <code className="text-[11px] font-mono text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">{report.githubLastCommit}</code>
            <span className="text-xs text-slate-400 truncate">{report.githubLastCommitMsg}</span>
          </div>
        </div>
      ) : null}
    </Card>
  )
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function SourceCard({ icon, name, value, label, delta, ok }: {
  icon: React.ReactNode; name: string; value: string; label: string; delta?: number; ok: boolean
}) {
  return (
    <div className="bg-[#1c2232] border border-white/[0.05] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-slate-400">
          {icon}
          <span className="text-xs font-medium">{name}</span>
        </div>
        <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-slate-600'}`} />
      </div>
      <div className="text-2xl font-bold text-white mb-0.5">{value}</div>
      <div className="text-xs text-slate-400 flex items-center gap-1.5">
        {label}
        {delta !== undefined && delta !== 0 && (
          <span className={`flex items-center gap-0.5 font-medium ${delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {delta > 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
    </div>
  )
}

function Card({ title, icon, children, action }: {
  title: string; icon?: React.ReactNode; children: React.ReactNode; action?: React.ReactNode
}) {
  return (
    <div className="bg-[#1c2232] border border-white/[0.05] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          {icon && <span className="text-slate-500">{icon}</span>}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  )
}

function DataRow({ label, value, delta, invertDelta, danger, warn }: {
  label: string; value?: string; delta?: number; invertDelta?: boolean; danger?: boolean; warn?: boolean
}) {
  const isPositive = invertDelta ? (delta !== undefined && delta < 0) : (delta !== undefined && delta > 0)
  const isNegative = invertDelta ? (delta !== undefined && delta > 0) : (delta !== undefined && delta < 0)
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`font-semibold ${danger ? 'text-red-400' : warn ? 'text-amber-400' : 'text-white'}`}>
          {value || '—'}
        </span>
        {delta !== undefined && delta !== 0 && (
          <span className={`text-xs flex items-center gap-0.5 font-medium ${isPositive ? 'text-emerald-400' : isNegative ? 'text-red-400' : 'text-slate-500'}`}>
            {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
    </div>
  )
}

function ScoreBar({ label, value }: { label: string; value?: number }) {
  const color = !value ? 'bg-slate-700' : value >= 90 ? 'bg-emerald-500' : value >= 70 ? 'bg-amber-500' : 'bg-red-500'
  const textColor = !value ? 'text-slate-500' : value >= 90 ? 'text-emerald-400' : value >= 70 ? 'text-amber-400' : 'text-red-400'
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-slate-400">{label}</span>
        <span className={`text-xs font-semibold ${textColor}`}>{value ?? '—'}</span>
      </div>
      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value || 0}%` }} />
      </div>
    </div>
  )
}

function TaskCount({ label, value, color }: { label: string; value?: number; color: string }) {
  return (
    <div className="flex-1 bg-white/[0.03] rounded-lg p-3 text-center">
      <div className={`text-xl font-bold ${color}`}>{value ?? '—'}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  )
}

function StatusTile({ status, count, color }: { status: string; count: number; color: string }) {
  return (
    <div
      className="rounded-xl p-4 border"
      style={{ backgroundColor: color + '15', borderColor: color + '35' }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <span className="text-xs text-slate-400 capitalize truncate">{status}</span>
      </div>
      <div className="text-2xl font-bold text-white">{count}</div>
    </div>
  )
}

function TaskDot({ status, statusColor }: { status: string; statusColor?: string }) {
  if (statusColor) {
    return <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor }} />
  }
  const s = status.toLowerCase()
  const color = s.includes('done') || s.includes('complete') ? 'bg-emerald-400' :
    s.includes('progress') || s.includes('active') ? 'bg-purple-400' :
    s.includes('planning') ? 'bg-blue-400' :
    s.includes('error') || s.includes('bug') ? 'bg-red-400' : 'bg-slate-600'
  return <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${color}`} />
}

function TaskBadge({ status, statusColor }: { status: string; statusColor?: string }) {
  if (statusColor) {
    return (
      <span
        className="text-[10px] px-2 py-0.5 rounded-full capitalize border font-medium"
        style={{ color: statusColor, borderColor: statusColor + '50', backgroundColor: statusColor + '18' }}
      >
        {status}
      </span>
    )
  }
  const s = status.toLowerCase()
  const cls = s.includes('done') || s.includes('complete') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
    s.includes('progress') ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
    s.includes('planning') ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
    s.includes('error') ? 'bg-red-500/10 text-red-400 border-red-500/20' :
    'bg-white/5 text-slate-400 border-white/10'
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize border font-medium ${cls}`}>
      {status}
    </span>
  )
}

function RecommendationCard({ rec }: { rec: AIRecommendation }) {
  const priorityCls = rec.priority === 'high' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
    rec.priority === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
    'bg-white/5 text-slate-400 border-white/10'
  const categoryCls = rec.category === 'performance' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
    rec.category === 'seo' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
    rec.category === 'security' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
    rec.category === 'ux' ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' :
    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  return (
    <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.05]">
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize border ${categoryCls}`}>{rec.category}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize border ${priorityCls}`}>{rec.priority} priority</span>
      </div>
      <div className="text-sm font-medium text-white mb-0.5">{rec.title}</div>
      <div className="text-xs text-slate-400 leading-relaxed">{rec.description}</div>
    </div>
  )
}

function AssigneeAvatars({ assignees }: { assignees: TaskAssignee[] }) {
  return (
    <div className="flex -space-x-1.5">
      {assignees.slice(0, 3).map((a, i) => (
        a.avatar
          ? <img key={i} src={a.avatar} alt={a.name} title={a.name} className="w-5 h-5 rounded-full border border-[#1c2232] object-cover" />
          : <span key={i} title={a.name} className="w-5 h-5 rounded-full border border-[#1c2232] bg-purple-600/40 text-purple-300 text-[9px] font-bold flex items-center justify-center uppercase">
              {a.name?.[0] || '?'}
            </span>
      ))}
      {assignees.length > 3 && (
        <span className="w-5 h-5 rounded-full border border-[#1c2232] bg-slate-700 text-slate-400 text-[9px] font-bold flex items-center justify-center">
          +{assignees.length - 3}
        </span>
      )}
    </div>
  )
}

function EmptyReport({ onSync, syncing }: { onSync: () => void; syncing: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-6">
      <div className="w-14 h-14 rounded-2xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center mb-4">
        <BarChart2 className="w-7 h-7 text-purple-400" />
      </div>
      <h3 className="text-base font-semibold text-white mb-2">No report for this month</h3>
      <p className="text-sm text-slate-400 mb-5 max-w-xs">Sync data from GA4, PageSpeed, SEMrush, and ClickUp to generate this report.</p>
      <button
        onClick={onSync}
        disabled={syncing}
        className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
      >
        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
        {syncing ? 'Syncing…' : 'Sync data now'}
      </button>
    </div>
  )
}

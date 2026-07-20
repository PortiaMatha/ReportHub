'use client'

import { useEffect, useState } from 'react'
import React from 'react'
import type { Client, ReportData } from '@/types'
import { BarChart2, Zap, Search, CheckSquare, ArrowUp, ArrowDown, FileText } from 'lucide-react'

interface Props {
  clients: Client[]
  onSelectClient: (c: Client) => void
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// ─── Sparkline area chart ────────────────────────────────────────────────────

function SparkChart({
  id,
  values,
  labels,
  color,
  trackLabel,
  currentValue,
}: {
  id: string
  values: number[]
  labels: string[]
  color: string
  trackLabel: string
  currentValue: string
}) {
  const W = 200
  const H = 52

  const hasData = values.length >= 2 && values.some(v => v > 0)

  let linePath = ''
  let areaPath = ''
  let lastPt = { x: W, y: H / 2 }

  if (hasData) {
    const max = Math.max(...values)
    const min = Math.min(...values)
    const range = max - min || max || 1
    const pad = 4

    const pts = values.map((v, i) => ({
      x: (i / (values.length - 1)) * W,
      y: H - pad - ((v - min) / range) * (H - pad * 2),
    }))

    lastPt = pts[pts.length - 1]
    linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    areaPath = `${linePath} L${lastPt.x.toFixed(1)},${H} L0,${H} Z`
  }

  // Show only first and last label, or evenly spaced if many months
  const visibleLabels = labels.map((l, i) => {
    const show = i === 0 || i === labels.length - 1 || (labels.length >= 6 && i % Math.floor(labels.length / 3) === 0)
    return show ? l : ''
  })

  return (
    <div className="flex-1 min-w-0">
      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">{trackLabel}</div>
      <div className="text-base font-bold text-white mb-2 leading-none">{currentValue}</div>

      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height: 52 }}>
        <defs>
          <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {hasData ? (
          <>
            <path d={areaPath} fill={`url(#grad-${id})`} />
            <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={lastPt.x} cy={lastPt.y} r="2.5" fill={color} />
          </>
        ) : (
          <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4 4" />
        )}
      </svg>

      <div className="flex justify-between mt-1">
        {visibleLabels.map((l, i) => (
          <span key={i} className={`text-[9px] ${l ? 'text-slate-600' : ''}`}>{l}</span>
        ))}
      </div>
    </div>
  )
}

// ─── Metric pill ─────────────────────────────────────────────────────────────

function MetricBlock({ icon, name, value, delta }: {
  icon: React.ReactNode; name: string; value: string; delta?: number | null
}) {
  return (
    <div className="flex-1 min-w-0 bg-white/[0.03] rounded-lg px-2.5 py-2">
      <div className="flex items-center gap-1 text-slate-600 mb-1">
        {icon}
        <span className="text-[9px] font-semibold uppercase tracking-wider truncate">{name}</span>
      </div>
      <div className="text-sm font-bold text-white leading-none">{value}</div>
      {delta !== undefined && delta !== null && delta !== 0 && (
        <div className={`text-[10px] flex items-center gap-0.5 font-semibold mt-0.5 ${delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {delta > 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
          {Math.abs(delta)}%
        </div>
      )}
    </div>
  )
}

// ─── Client card ─────────────────────────────────────────────────────────────

function FaviconOrDot({ domain, color }: { domain: string; color: string }) {
  const [failed, setFailed] = useState(false)
  const clean = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  if (failed) return <span className="w-5 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
  return (
    <img src={`https://icons.duckduckgo.com/ip3/${clean}.ico`} alt="" width={20} height={20}
      className="w-5 h-5 rounded-sm object-contain flex-shrink-0"
      onError={() => setFailed(true)} />
  )
}

function ClientReportCard({ client, history, onClick }: {
  client: Client
  history: ReportData[]
  onClick: () => void
}) {
  // history is sorted oldest → newest
  const latest = history[history.length - 1] ?? null
  const period = latest ? `${MONTH_NAMES[latest.month - 1]} ${latest.year}` : null

  // Build chart series: last 12 months
  const series = history.slice(-12)
  const labels = series.map(r => MONTH_NAMES[r.month - 1])

  const ga4Values = series.map(r => r.sessions ?? 0)
  const speedValues = series.map(r => r.desktopPerf ?? 0)
  const semValues = series.map(r => r.siteHealth ?? 0)

  const ga4Current = latest?.sessions
    ? latest.sessions >= 1000 ? `${(latest.sessions / 1000).toFixed(1)}K` : String(latest.sessions)
    : '—'
  const speedCurrent = latest?.desktopPerf ? String(latest.desktopPerf) : '—'
  const semCurrent = latest?.siteHealth ? `${latest.siteHealth}%` : '—'
  const tasksCurrent = latest?.openTasks != null ? String(latest.openTasks) : '—'

  const cid = client.id.replace(/[^a-z0-9]/gi, '')

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-[#1c2232] border border-white/[0.05] rounded-xl p-5 hover:border-purple-500/30 hover:bg-[#1e2538] transition-all group"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5 min-w-0">
          <FaviconOrDot domain={client.domain} color={client.color} />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white truncate group-hover:text-purple-300 transition-colors">
              {client.name}
            </div>
            <div className="text-[11px] text-slate-500 truncate">{client.domain}</div>
          </div>
        </div>
        {period && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ml-3 ${
            latest?.status === 'published' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'
          }`}>
            {period}
          </span>
        )}
      </div>

      {history.length > 0 ? (
        <>
          {/* Yearly charts */}
          <div className="flex gap-4 mb-4 pb-4 border-b border-white/[0.05]">
            <SparkChart
              id={`${cid}-ga4`}
              values={ga4Values}
              labels={labels}
              color="#8b5cf6"
              trackLabel="GA4 Sessions"
              currentValue={ga4Current}
            />
            <div className="w-px bg-white/[0.05] flex-shrink-0" />
            <SparkChart
              id={`${cid}-speed`}
              values={speedValues}
              labels={labels}
              color="#38bdf8"
              trackLabel="PageSpeed"
              currentValue={speedCurrent}
            />
            <div className="w-px bg-white/[0.05] flex-shrink-0" />
            <SparkChart
              id={`${cid}-sem`}
              values={semValues}
              labels={labels}
              color="#34d399"
              trackLabel="SEMrush"
              currentValue={semCurrent}
            />
          </div>

          {/* Metric row */}
          <div className="flex gap-2">
            <MetricBlock icon={<BarChart2 className="w-2.5 h-2.5" />} name="Sessions" value={ga4Current} delta={latest?.sessionsDelta} />
            <MetricBlock icon={<Zap className="w-2.5 h-2.5" />} name="Desktop" value={speedCurrent} />
            <MetricBlock icon={<Search className="w-2.5 h-2.5" />} name="Health" value={semCurrent} />
            <MetricBlock icon={<CheckSquare className="w-2.5 h-2.5" />} name="Tasks" value={tasksCurrent} />
          </div>
        </>
      ) : (
        <div className="py-8 flex flex-col items-center justify-center text-center">
          <FileText className="w-6 h-6 text-slate-700 mb-2" />
          <p className="text-xs text-slate-600">No report data yet</p>
        </div>
      )}
    </button>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function OverviewView({ clients, onSelectClient }: Props) {
  const [historyByClient, setHistoryByClient] = useState<Record<string, ReportData[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/reports')
      .then(r => r.json())
      .then((data: ReportData[]) => {
        const map: Record<string, ReportData[]> = {}
        for (const r of data) {
          if (!map[r.clientId]) map[r.clientId] = []
          map[r.clientId].push(r)
        }
        // Sort each client's history oldest → newest
        for (const id in map) {
          map[id].sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
        }
        setHistoryByClient(map)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="p-8">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-white mb-1">Overview</h1>
        <p className="text-sm text-slate-400">Yearly trends across all clients</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-72 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <FileText className="w-10 h-10 text-slate-700 mb-3" />
          <p className="text-slate-500 text-sm">No clients yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {clients.map(client => (
            <ClientReportCard
              key={client.id}
              client={client}
              history={historyByClient[client.id] ?? []}
              onClick={() => onSelectClient(client)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

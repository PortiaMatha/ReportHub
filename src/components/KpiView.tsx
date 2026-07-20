'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Pencil, Trash2, X, ChevronDown, ArrowUp, ArrowDown, RefreshCw, Globe, Search, Share2, Star, Megaphone, Users, Mail, MessageCircle } from 'lucide-react'
import type {
  Client, Kpi, KpiSection, KpiMeasurementType, KpiDirection, KpiGoalMethod, KpiPacingMethod,
  KpiSource, KpiStatus, KpiWeekValue,
} from '@/types'
import {
  computeYtdActual, computeExpectedYtd, computeOverUnder, computeDynamicWeekly, computeProgressPercent,
  computeWeeklyResult, formatDurationSeconds, parseDurationToSeconds, parseNumeric,
  lastCompletedWeekStartISO, formatWeekRange,
} from '@/lib/kpi'
import { KPI_PRESETS, SOURCE_LABELS } from '@/lib/kpiPresets'
import CommentsSection from './CommentsSection'

interface Props {
  client: Client
}

const SECTIONS: { id: KpiSection; icon: React.ElementType }[] = [
  { id: 'Web', icon: Globe },
  { id: 'SEO', icon: Search },
  { id: 'Social', icon: Share2 },
  { id: 'Influencer Management', icon: Star },
  { id: 'Paid Media', icon: Megaphone },
  { id: 'Account Management', icon: Users },
  { id: 'Email', icon: Mail },
  { id: 'Community Management', icon: MessageCircle },
]

const MEASUREMENT_TYPE_LABELS: Record<KpiMeasurementType, string> = {
  cumulative: 'Cumulative total',
  rate: 'Rate (from raw totals)',
  snapshot: 'Snapshot',
  duration: 'Duration',
}

const MEASUREMENT_TYPE_HELP: Record<KpiMeasurementType, string> = {
  cumulative: 'YTD sums every logged week (sessions, conversions, revenue…).',
  rate: 'YTD = total numerator ÷ total denominator across logged weeks — not an average of weekly percentages.',
  snapshot: 'YTD = most recent logged week (site health, rankings, scores…).',
  duration: 'YTD = total duration seconds ÷ total sessions — a true weighted average.',
}

const DIRECTION_LABELS: Record<KpiDirection, string> = {
  higher: 'Higher is better',
  lower: 'Lower is better',
  range: 'Target range',
  informational: 'Informational only',
}

const GOAL_METHOD_LABELS: Record<KpiGoalMethod, string> = {
  manual: 'Manual target',
  baseline_avg: 'Previous-year baseline average',
  growth: 'Growth-based (previous year × growth %)',
}

const PACING_METHOD_LABELS: Record<KpiPacingMethod, string> = {
  straight_line: 'Straight-line (evenly distributed)',
  weekly_plan: 'Custom weekly plan',
}

const STATUS_DOT: Record<KpiStatus, string> = {
  green: 'bg-emerald-400',
  orange: 'bg-amber-400',
  red: 'bg-red-400',
}

function formatValue(v: number | null | undefined, kpi: Kpi): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  if (kpi.measurementType === 'duration') return formatDurationSeconds(v)
  const rounded = Math.round(v * 100) / 100
  return `${rounded.toLocaleString()}${kpi.unit || ''}`
}

interface WeekLogFields {
  value?: string
  denominatorValue?: string
  plannedTarget?: string
}

interface WeekPatch {
  weekStart?: string
  value?: string
  denominatorValue?: string
  commentary?: string
}

const SINGLE_ROW_COLS = 'grid-cols-[118px_56px_56px_56px_46px_14px_1fr_20px]'
const DUAL_ROW_COLS = 'grid-cols-[118px_56px_50px_50px_56px_46px_14px_1fr_20px]'

const rowInputClass = 'bg-white/[0.03] border border-white/5 rounded px-1 py-1 text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500/40 transition-colors w-full text-right'

// ─── Weekly table row ──────────────────────────────────────────────────────────

function WeekRow({ kpi, week, onDeleteWeek, onUpdateWeek }: {
  kpi: Kpi
  week: KpiWeekValue
  onDeleteWeek: (weekId: string) => Promise<void>
  onUpdateWeek: (weekId: string, patch: WeekPatch) => Promise<void>
}) {
  const isRate = kpi.measurementType === 'rate'
  const isDuration = kpi.measurementType === 'duration'
  const isDualEntry = isRate || isDuration
  // rate/duration scale: percentage rates are stored as a 0-100 number, everything else (duration
  // seconds, $ rates like CPC/ROAS) is unscaled.
  const scaleFactor = isRate && kpi.unit === '%' ? 100 : 1

  // For rate/duration KPIs, week.value stores the raw NUMERATOR (bounces, total engagement seconds…)
  // so computeYtdActual can weight correctly — but a human should read/edit the derived RATE or AVERAGE
  // that the column is actually named after (e.g. "Bounce Rate", not "Bounces").
  const initialDerived = week.value != null && week.denominatorValue ? (week.value / week.denominatorValue) * scaleFactor : null
  const [weekStart, setWeekStart] = useState(week.weekStart.slice(0, 10))
  const [value, setValue] = useState(
    isDuration ? formatDurationSeconds(initialDerived)
      : isRate ? (initialDerived !== null ? String(Math.round(initialDerived * 100) / 100) : '')
      : (week.value !== null && week.value !== undefined ? String(week.value) : '')
  )
  const [denominatorValue, setDenominatorValue] = useState(week.denominatorValue !== null && week.denominatorValue !== undefined ? String(week.denominatorValue) : '')
  const [commentary, setCommentary] = useState(week.commentary || '')
  const [error, setError] = useState('')
  const { plannedWeekly, weeklyVariance, achievementPercent, status } = computeWeeklyResult(kpi, week)

  const commit = async (patch: WeekPatch) => {
    setError('')
    try {
      await onUpdateWeek(week.id, patch)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  // Rate/duration's Value/Denominator inputs are entangled (rate × denominator = stored numerator), so
  // either field blurring must recompute and commit both together.
  const commitDualEntry = async () => {
    const parsedDisplay = isDuration ? parseDurationToSeconds(value) : parseNumeric(value)
    if (parsedDisplay === null) {
      setError(isDuration ? 'Could not parse duration — use a format like 4m 34s' : 'Enter a number')
      return
    }
    const denom = Number(denominatorValue)
    if (denominatorValue === '' || Number.isNaN(denom) || denom <= 0) {
      setError(`Enter ${kpi.denominatorLabel || 'total'} to compute the total`)
      return
    }
    const numerator = (parsedDisplay / scaleFactor) * denom
    if (numerator !== week.value || denom !== week.denominatorValue) {
      await commit({ value: String(numerator), denominatorValue: String(denom) })
    }
    setValue(isDuration ? formatDurationSeconds(parsedDisplay) : String(Math.round(parsedDisplay * 100) / 100))
  }

  const handleValueBlur = () => {
    if (isDualEntry) { commitDualEntry(); return }
    if (value !== (week.value ?? '').toString()) commit({ value })
  }

  const handleDenominatorBlur = () => {
    if (isDualEntry) { commitDualEntry(); return }
    if (denominatorValue !== (week.denominatorValue ?? '').toString()) commit({ denominatorValue })
  }

  return (
    <div>
      <div className={`grid ${isDualEntry ? DUAL_ROW_COLS : SINGLE_ROW_COLS} items-center gap-2 text-xs px-1.5 py-1.5 rounded hover:bg-white/5 group`}>
        <input
          type="date"
          value={weekStart}
          onChange={e => setWeekStart(e.target.value)}
          onBlur={() => { if (weekStart !== week.weekStart.slice(0, 10)) commit({ weekStart }) }}
          className="bg-white/[0.03] border border-white/5 rounded px-1 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-purple-500/40 transition-colors w-full"
        />
        <span className="text-slate-300 text-right">{plannedWeekly !== null ? formatValue(plannedWeekly, kpi) : '—'}</span>
        <input
          type={isDuration ? 'text' : 'number'}
          value={value}
          onChange={e => setValue(e.target.value)}
          onBlur={handleValueBlur}
          placeholder={isDuration ? 'e.g. 4m 34s' : undefined}
          className={rowInputClass}
        />
        {isDualEntry && (
          <input
            type="number"
            value={denominatorValue}
            onChange={e => setDenominatorValue(e.target.value)}
            onBlur={handleDenominatorBlur}
            className={rowInputClass}
          />
        )}
        <span className={`text-right ${
          weeklyVariance === null ? 'text-slate-500'
            : (kpi.direction === 'lower' ? weeklyVariance <= 0 : weeklyVariance >= 0) ? 'text-emerald-400' : 'text-red-400'
        }`}>
          {weeklyVariance === null ? '—' : `${weeklyVariance >= 0 ? '+' : ''}${formatValue(weeklyVariance, kpi)}`}
        </span>
        <span className="text-slate-400 text-right">{achievementPercent === null ? '—' : `${achievementPercent.toFixed(1)}%`}</span>
        <span className={`w-2 h-2 rounded-full mx-auto ${status ? STATUS_DOT[status] : 'bg-slate-700'}`} title={status || undefined} />
        <input
          type="text"
          value={commentary}
          onChange={e => setCommentary(e.target.value)}
          onBlur={() => { if (commentary !== (week.commentary || '')) commit({ commentary }) }}
          placeholder="Commentary…"
          className="bg-white/[0.03] border border-white/5 rounded px-1.5 py-1 text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-purple-500/40 transition-colors w-full"
        />
        <button
          onClick={() => onDeleteWeek(week.id)}
          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      {error && <p className="text-[10px] text-red-400 px-1.5 pb-1">{error}</p>}
    </div>
  )
}

// ─── Weekly log + table panel ──────────────────────────────────────────────────

function WeeklyPanel({ kpi, year, onLogWeek, onDeleteWeek, onSyncWeek, onUpdateWeek }: {
  kpi: Kpi
  year: number
  onLogWeek: (weekStart: string, fields: WeekLogFields) => Promise<void>
  onDeleteWeek: (weekId: string) => Promise<void>
  onSyncWeek: (weekStart: string) => Promise<void>
  onUpdateWeek: (weekId: string, patch: WeekPatch) => Promise<void>
}) {
  const [newWeek, setNewWeek] = useState(lastCompletedWeekStartISO())
  const [newValue, setNewValue] = useState('')
  const [newDenominator, setNewDenominator] = useState('')
  const [newPlanned, setNewPlanned] = useState('')
  const [saving, setSaving] = useState(false)
  const [addError, setAddError] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState('')

  const isRate = kpi.measurementType === 'rate'
  const isDuration = kpi.measurementType === 'duration'
  const isDualEntry = isRate || isDuration
  const scaleFactor = isRate && kpi.unit === '%' ? 100 : 1
  const showPlanned = kpi.measurementType === 'cumulative' && kpi.pacingMethod === 'weekly_plan'

  const weeks = [...kpi.weeklyValues]
    .filter(w => new Date(w.weekStart).getUTCFullYear() === year)
    .sort((a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime())

  const handleAdd = async () => {
    if (!newWeek || newValue === '' || (isDualEntry && newDenominator === '')) return
    setAddError('')
    let value = newValue
    if (isDualEntry) {
      // newValue is the week's derived RATE or AVERAGE duration — back-derive the raw numerator
      // (rate × denominator, or avgSeconds × sessions) so weighted YTD math works.
      const denom = Number(newDenominator)
      if (Number.isNaN(denom) || denom <= 0) { setAddError(`Enter ${kpi.denominatorLabel || 'total'} to compute the total`); return }
      if (isDuration) {
        const avgSeconds = parseDurationToSeconds(newValue)
        if (avgSeconds === null) { setAddError('Could not parse duration — use a format like 4m 34s'); return }
        value = String(avgSeconds * denom)
      } else {
        const rate = parseNumeric(newValue)
        if (rate === null) { setAddError('Enter a number'); return }
        value = String((rate / scaleFactor) * denom)
      }
    }
    setSaving(true)
    try {
      await onLogWeek(newWeek, {
        value,
        denominatorValue: isDualEntry ? newDenominator : undefined,
        plannedTarget: showPlanned && newPlanned !== '' ? newPlanned : undefined,
      })
      setNewValue(''); setNewDenominator(''); setNewPlanned('')
    } finally {
      setSaving(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setSyncError('')
    try {
      await onSyncWeek(newWeek)
    } catch (e) {
      setSyncError((e as Error).message)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="mt-2 mb-1 bg-black/20 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <input
          type="date"
          value={newWeek}
          onChange={e => setNewWeek(e.target.value)}
          className="bg-white/[0.04] border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-purple-500/50 transition-colors"
        />
        {kpi.source ? (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white px-2.5 py-1 rounded-lg font-medium transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
            Sync from {SOURCE_LABELS[kpi.source]}
          </button>
        ) : null}
        <input
          type={isDuration ? 'text' : 'number'}
          value={newValue}
          onChange={e => setNewValue(e.target.value)}
          placeholder={isDuration ? 'e.g. 4m 34s' : isDualEntry ? (kpi.name || 'Result') : 'Value'}
          className="w-24 bg-white/[0.04] border border-white/10 rounded-lg px-2 py-1 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 transition-colors"
        />
        {isDualEntry && (
          <input
            type="number"
            value={newDenominator}
            onChange={e => setNewDenominator(e.target.value)}
            placeholder={kpi.denominatorLabel || 'Total'}
            className="w-24 bg-white/[0.04] border border-white/10 rounded-lg px-2 py-1 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 transition-colors"
          />
        )}
        {showPlanned && (
          <input
            type="number"
            value={newPlanned}
            onChange={e => setNewPlanned(e.target.value)}
            placeholder="Planned target"
            className="w-28 bg-white/[0.04] border border-white/10 rounded-lg px-2 py-1 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 transition-colors"
          />
        )}
        <button
          onClick={handleAdd}
          disabled={saving || newValue === ''}
          className="text-xs border border-white/10 rounded-lg px-2.5 py-1 text-slate-300 hover:bg-white/5 disabled:opacity-40 transition-colors"
        >
          Log manually
        </button>
      </div>
      <p className="text-[11px] text-slate-500 mb-1">
        {newWeek ? `${formatWeekRange(newWeek)} (7 days from the chosen date)` : 'Pick a date to see the 7-day range'}
        {isDualEntry && ` — enter this week's ${kpi.name || 'result'} and ${kpi.denominatorLabel || 'total'}; the underlying total is derived and weighted into YTD`}
      </p>
      {kpi.source && kpi.source !== 'ga4' && (
        <p className="text-[11px] text-amber-400/70 mb-2">{SOURCE_LABELS[kpi.source]} only exposes a live snapshot — syncing logs today's current value against this week, not true history.</p>
      )}
      {syncError && <p className="text-[11px] text-red-400 mb-2">{syncError}</p>}
      {addError && <p className="text-[11px] text-red-400 mb-2">{addError}</p>}

      {weeks.length === 0 ? (
        <p className="text-xs text-slate-500">No weekly values logged for {year} yet.</p>
      ) : (
        <div className="max-h-56 overflow-y-auto">
          <div className={`grid ${isDualEntry ? DUAL_ROW_COLS : SINGLE_ROW_COLS} gap-2 text-[10px] text-slate-500 uppercase tracking-wide px-1.5 mb-1`}>
            <span>Date</span><span className="text-right">Planned</span>
            <span className="text-right">{isDualEntry ? (kpi.name || 'Result') : 'Value'}</span>
            {isDualEntry && <span className="text-right">{kpi.denominatorLabel || 'Total'}</span>}
            <span className="text-right">Var.</span><span className="text-right">Achv%</span><span></span>
            <span>Commentary</span><span></span>
          </div>
          <div className="space-y-0.5">
            {weeks.map(w => (
              <WeekRow key={w.id} kpi={kpi} week={w} onDeleteWeek={onDeleteWeek} onUpdateWeek={onUpdateWeek} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Pipeline summary strip ────────────────────────────────────────────────────

function PipelineStrip({ kpi, year }: { kpi: Kpi; year: number }) {
  const goal = parseNumeric(kpi.yearGoal)
  const actual = computeYtdActual(kpi, year)
  const expected = computeExpectedYtd(kpi, year)
  const { overUnder, variancePercent } = computeOverUnder(kpi, year)
  const { original, dynamic } = computeDynamicWeekly(kpi, year)

  return (
    <div className="grid grid-cols-5 gap-2 mb-2">
      <PipelineStat label="Year Goal" value={formatValue(goal, kpi)} />
      <PipelineStat label={`YTD Actual ${year}`} value={formatValue(actual, kpi)} />
      <PipelineStat label="Expected by Today" value={formatValue(expected, kpi)} />
      <div className="bg-white/[0.03] rounded-lg px-2.5 py-2">
        <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Over / Under</div>
        <div className={`text-sm font-semibold ${overUnder === null ? 'text-slate-500' : overUnder >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {overUnder === null ? '—' : `${overUnder >= 0 ? '+' : ''}${formatValue(overUnder, kpi)}`}
        </div>
        {variancePercent !== null && (
          <div className={`text-[10px] mt-0.5 ${variancePercent >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
            {Math.abs(variancePercent).toFixed(1)}% {variancePercent >= 0 ? 'ahead' : 'behind'}
          </div>
        )}
      </div>
      <div className="bg-white/[0.03] rounded-lg px-2.5 py-2">
        <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Dynamic Weekly Target</div>
        <div className="text-sm font-semibold text-white">{dynamic === null ? '—' : formatValue(dynamic, kpi)}</div>
        {kpi.measurementType === 'cumulative' && original !== null && (
          <div className="text-[10px] text-slate-500 mt-0.5">Original: {formatValue(original, kpi)}</div>
        )}
      </div>
    </div>
  )
}

function PipelineStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/[0.03] rounded-lg px-2.5 py-2">
      <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">{label}</div>
      <div className="text-sm font-semibold text-white">{value}</div>
    </div>
  )
}

// ─── KPI row ────────────────────────────────────────────────────────────────────

function KpiRow({ kpi, year, isFirst, isLast, onEdit, onDelete, onMove, onLogWeek, onDeleteWeek, onSyncWeek, onUpdateWeek }: {
  kpi: Kpi
  year: number
  isFirst: boolean
  isLast: boolean
  onEdit: () => void
  onDelete: () => void
  onMove: (direction: 'up' | 'down') => void
  onLogWeek: (weekStart: string, fields: WeekLogFields) => Promise<void>
  onDeleteWeek: (weekId: string) => Promise<void>
  onSyncWeek: (weekStart: string) => Promise<void>
  onUpdateWeek: (weekId: string, patch: WeekPatch) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const ytd = computeYtdActual(kpi, year)
  const goal = parseNumeric(kpi.yearGoal)
  const { overUnder } = computeOverUnder(kpi, year)
  const pct = computeProgressPercent(kpi, year)

  return (
    <div className="py-3 border-t border-white/[0.05] first:border-t-0 group">
      <div className="flex items-center gap-4">
        <button onClick={() => setExpanded(v => !v)} className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-1.5">
            <ChevronDown className={`w-3 h-3 text-slate-500 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            <p className="text-sm font-medium text-white truncate">{kpi.name}</p>
            {kpi.owner && <span className="text-[10px] text-slate-500 bg-white/5 rounded px-1.5 py-0.5 flex-shrink-0">{kpi.owner}</span>}
            {kpi.source && <span className="text-[10px] text-purple-300 bg-purple-500/10 rounded px-1.5 py-0.5 flex-shrink-0">{SOURCE_LABELS[kpi.source]}</span>}
            <span className="text-[10px] text-slate-500 bg-white/5 rounded px-1.5 py-0.5 flex-shrink-0 capitalize">{kpi.measurementType}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 ml-[18px]">
            <span>Goal: <span className="text-slate-300">{goal !== null ? formatValue(goal, kpi) : '—'}</span></span>
            <span>YTD {year}: <span className="text-slate-300">{formatValue(ytd, kpi)}</span></span>
            {overUnder !== null && (
              <span className={overUnder >= 0 ? 'text-emerald-400' : 'text-amber-400'}>
                {overUnder >= 0 ? '+' : ''}{formatValue(overUnder, kpi)}
              </span>
            )}
          </div>
          {pct !== null && (
            <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden mt-2 max-w-[180px] ml-[18px]">
              <div
                className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : pct >= 60 ? 'bg-purple-500' : 'bg-amber-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
        </button>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={() => onMove('up')} disabled={isFirst} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:hover:bg-transparent transition-colors">
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onMove('down')} disabled={isLast} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:hover:bg-transparent transition-colors">
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button onClick={onEdit} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div>
          <PipelineStrip kpi={kpi} year={year} />
          <WeeklyPanel kpi={kpi} year={year} onLogWeek={onLogWeek} onDeleteWeek={onDeleteWeek} onSyncWeek={onSyncWeek} onUpdateWeek={onUpdateWeek} />
        </div>
      )}
    </div>
  )
}

// ─── Add/Edit KPI modal ─────────────────────────────────────────────────────────

interface KpiFormData {
  name: string
  owner: string
  yearGoal: string
  unit: string
  measurementType: KpiMeasurementType
  direction: KpiDirection
  denominatorLabel: string | null
  goalMethod: KpiGoalMethod
  goalBaseline: number | null
  goalGrowthPercent: number | null
  pacingMethod: KpiPacingMethod
  source: KpiSource | null
  metricKey: string | null
}

function KpiFormModal({
  section, kpi, onClose, onSaved,
}: {
  section: KpiSection
  kpi: Kpi | null
  onClose: () => void
  onSaved: (data: KpiFormData) => Promise<void>
}) {
  const [preset, setPreset] = useState('')
  const [name, setName] = useState(kpi?.name || '')
  const [owner, setOwner] = useState(kpi?.owner || '')
  const [yearGoal, setYearGoal] = useState(kpi?.yearGoal || '')
  const [unit, setUnit] = useState(kpi?.unit || '')
  const [measurementType, setMeasurementType] = useState<KpiMeasurementType>(kpi?.measurementType || 'cumulative')
  const [direction, setDirection] = useState<KpiDirection>(kpi?.direction || 'higher')
  const [denominatorLabel, setDenominatorLabel] = useState(kpi?.denominatorLabel || '')
  const [goalMethod, setGoalMethod] = useState<KpiGoalMethod>(kpi?.goalMethod || 'manual')
  const [goalGrowthPercent, setGoalGrowthPercent] = useState(kpi?.goalGrowthPercent != null ? String(kpi.goalGrowthPercent) : '')
  const [goalBaseline, setGoalBaseline] = useState<number | null>(kpi?.goalBaseline ?? null)
  const [pacingMethod, setPacingMethod] = useState<KpiPacingMethod>(kpi?.pacingMethod || 'straight_line')
  const [source, setSource] = useState<KpiSource | null>(kpi?.source ?? null)
  const [metricKey, setMetricKey] = useState<string | null>(kpi?.metricKey ?? null)
  const [saving, setSaving] = useState(false)
  const [computing, setComputing] = useState(false)
  const [error, setError] = useState('')

  const presets = KPI_PRESETS[section] || []
  const isDualEntry = measurementType === 'rate' || measurementType === 'duration'

  const handlePresetChange = (value: string) => {
    setPreset(value)
    const p = presets.find(p => p.name === value)
    if (p) {
      setName(p.name)
      setUnit(p.unit || '')
      setMeasurementType(p.measurementType || 'cumulative')
      setDirection(p.direction || 'higher')
      setDenominatorLabel(p.denominatorLabel || '')
      setSource(p.source || null)
      setMetricKey(p.metricKey || null)
    } else {
      setSource(null)
      setMetricKey(null)
    }
  }

  const handleComputeGoal = async () => {
    if (!kpi) return
    setComputing(true)
    setError('')
    try {
      const res = await fetch(`/api/kpis/${kpi.id}/goal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: goalMethod,
          growthPercent: goalMethod === 'growth' ? Number(goalGrowthPercent || 0) : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not compute goal')
      setYearGoal(String(Math.round(data.yearGoal * 100) / 100))
      setGoalBaseline(data.baseline)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setComputing(false)
    }
  }

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError('')
    try {
      await onSaved({
        name: name.trim(),
        owner,
        yearGoal,
        unit,
        measurementType,
        direction,
        denominatorLabel: denominatorLabel || null,
        goalMethod,
        goalBaseline,
        goalGrowthPercent: goalMethod === 'growth' ? Number(goalGrowthPercent || 0) : null,
        pacingMethod,
        source,
        metricKey,
      })
    } catch {
      setError('Failed to save KPI')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1c2232] border border-white/[0.08] rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div>
            <h2 className="font-semibold text-white">{kpi ? 'Edit KPI' : 'Add KPI'}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{section}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!kpi && presets.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Quick add</label>
              <select
                value={preset}
                onChange={e => handlePresetChange(e.target.value)}
                className="w-full appearance-none bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors cursor-pointer"
              >
                <option value="">Custom KPI…</option>
                {presets.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
              </select>
              {source && (
                <p className="text-xs text-purple-300 mt-1.5">Linked to {SOURCE_LABELS[source]} — weekly values can be synced automatically.</p>
              )}
            </div>
          )}
          <ModalField label="KPI name *" value={name} onChange={setName} placeholder="e.g. Organic sessions" />
          <ModalField label="Owner" value={owner} onChange={setOwner} placeholder="e.g. Anthony" />

          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Measurement type" value={measurementType} onChange={v => setMeasurementType(v as KpiMeasurementType)} options={MEASUREMENT_TYPE_LABELS} />
            <SelectField label="Direction" value={direction} onChange={v => setDirection(v as KpiDirection)} options={DIRECTION_LABELS} />
          </div>
          <p className="text-xs text-slate-500 -mt-2">{MEASUREMENT_TYPE_HELP[measurementType]}</p>

          {isDualEntry && (
            <ModalField label="Denominator label" value={denominatorLabel} onChange={setDenominatorLabel} placeholder="e.g. Reach, Sessions, Impressions" />
          )}

          <div className="grid grid-cols-2 gap-3">
            <ModalField label="Unit" value={unit} onChange={setUnit} placeholder="e.g. %, followers, $" />
            {measurementType === 'cumulative' && (
              <SelectField label="Pacing" value={pacingMethod} onChange={v => setPacingMethod(v as KpiPacingMethod)} options={PACING_METHOD_LABELS} />
            )}
          </div>

          <div className="border-t border-white/[0.06] pt-4">
            <SelectField label="Goal method" value={goalMethod} onChange={v => setGoalMethod(v as KpiGoalMethod)} options={GOAL_METHOD_LABELS} />

            {goalMethod === 'growth' && (
              <div className="mt-2">
                <ModalField label="Growth %" value={goalGrowthPercent} onChange={setGoalGrowthPercent} placeholder="20" />
              </div>
            )}

            {goalMethod !== 'manual' && (
              <div className="mt-2">
                {kpi ? (
                  <button
                    type="button"
                    onClick={handleComputeGoal}
                    disabled={computing}
                    className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 border border-purple-500/30 rounded-lg px-2.5 py-1 bg-purple-600/10 disabled:opacity-50 transition-colors"
                  >
                    {computing ? 'Computing…' : 'Compute from previous year'}
                  </button>
                ) : (
                  <p className="text-xs text-slate-500">Save this KPI first, then reopen it here to compute a goal from its logged history.</p>
                )}
                {goalBaseline !== null && (
                  <p className="text-xs text-slate-500 mt-1.5">Baseline: {goalBaseline.toLocaleString()} → Year Goal: {yearGoal}</p>
                )}
              </div>
            )}

            <div className="mt-3">
              <ModalField label="Year goal" value={yearGoal} onChange={setYearGoal} placeholder="120000" />
            </div>
          </div>

          {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="flex gap-2 px-6 pb-5">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-white/10 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 px-4 py-2 text-sm text-white rounded-lg font-medium disabled:opacity-50 transition-colors bg-purple-600 hover:bg-purple-700"
          >
            {saving ? 'Saving…' : kpi ? 'Save changes' : 'Add KPI'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-colors"
      />
    </div>
  )
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Record<string, string> }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full appearance-none bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors cursor-pointer"
      >
        {Object.entries(options).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  )
}

// ─── Root ───────────────────────────────────────────────────────────────────────

export default function KpiView({ client }: Props) {
  const clientId = client.id
  const [kpis, setKpis] = useState<Kpi[]>([])
  const [kpisLoading, setKpisLoading] = useState(false)
  const [modalSection, setModalSection] = useState<KpiSection | null>(null)
  const [editingKpi, setEditingKpi] = useState<Kpi | null>(null)
  const [year, setYear] = useState<number>(() => new Date().getFullYear())

  const yearOptions = (() => {
    const current = new Date().getFullYear()
    const loggedYears = kpis.flatMap(k => k.weeklyValues.map(w => new Date(w.weekStart).getUTCFullYear()))
    const years = new Set([current, 2025, ...loggedYears])
    return Array.from(years).sort((a, b) => b - a)
  })()

  // Only show the loading skeleton on the very first load for a client — every mutation
  // (log a week, sync, move, edit) also calls loadKpis, and swapping to the skeleton on
  // every refetch unmounts every KpiRow, wiping their expanded/edit state.
  const hasLoadedRef = useRef(false)

  const loadKpis = useCallback(async (id: string) => {
    if (!id) { setKpis([]); return }
    if (!hasLoadedRef.current) setKpisLoading(true)
    try {
      const res = await fetch(`/api/clients/${id}/kpis`)
      const data = await res.json()
      setKpis(data)
      hasLoadedRef.current = true
    } catch (e) {
      console.error(e)
    } finally {
      setKpisLoading(false)
    }
  }, [])

  useEffect(() => { hasLoadedRef.current = false; loadKpis(clientId) }, [clientId, loadKpis])

  const openAdd = (section: KpiSection) => { setModalSection(section); setEditingKpi(null) }
  const openEdit = (kpi: Kpi) => { setModalSection(kpi.section); setEditingKpi(kpi) }
  const closeModal = () => { setModalSection(null); setEditingKpi(null) }

  const patchKpi = (kpi: Kpi, overrides: Partial<KpiFormData & { order: number }>) =>
    fetch(`/api/kpis/${kpi.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        section: kpi.section,
        name: kpi.name,
        owner: kpi.owner,
        yearGoal: kpi.yearGoal,
        unit: kpi.unit,
        measurementType: kpi.measurementType,
        direction: kpi.direction,
        denominatorLabel: kpi.denominatorLabel,
        goalMethod: kpi.goalMethod,
        goalBaseline: kpi.goalBaseline,
        goalGrowthPercent: kpi.goalGrowthPercent,
        pacingMethod: kpi.pacingMethod,
        source: kpi.source,
        metricKey: kpi.metricKey,
        order: kpi.order,
        ...overrides,
      }),
    })

  const handleSaved = async (data: KpiFormData) => {
    if (editingKpi) {
      await patchKpi(editingKpi, data)
    } else if (modalSection) {
      const sectionOrders = kpis.filter(k => k.section === modalSection).map(k => k.order)
      const order = sectionOrders.length === 0 ? 0 : Math.max(...sectionOrders) + 1
      await fetch(`/api/clients/${clientId}/kpis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, section: modalSection, order }),
      })
    }
    closeModal()
    await loadKpis(clientId)
  }

  const handleDelete = async (kpi: Kpi) => {
    await fetch(`/api/kpis/${kpi.id}`, { method: 'DELETE' })
    await loadKpis(clientId)
  }

  const handleMove = async (kpi: Kpi, direction: 'up' | 'down') => {
    // Sort with a createdAt tiebreak, then re-sequence the whole section to 0..n-1 — swapping only the
    // two `order` values silently no-ops when they're tied (which duplicate/legacy data can produce).
    const sectionKpis = kpis
      .filter(k => k.section === kpi.section)
      .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt))
    const idx = sectionKpis.findIndex(k => k.id === kpi.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sectionKpis.length) return

    const reordered = [...sectionKpis]
    ;[reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]]

    await Promise.all(
      reordered.map((k, i) => (k.order === i ? null : patchKpi(k, { order: i })))
    )
    await loadKpis(clientId)
  }

  const handleLogWeek = async (kpi: Kpi, weekStart: string, fields: WeekLogFields) => {
    const body: Record<string, unknown> = { weekStart }
    if (fields.value !== undefined) body.value = fields.value
    if (fields.denominatorValue !== undefined) body.denominatorValue = fields.denominatorValue
    if (fields.plannedTarget !== undefined) body.plannedTarget = fields.plannedTarget
    await fetch(`/api/kpis/${kpi.id}/weeks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    await loadKpis(clientId)
  }

  const handleUpdateWeek = async (weekId: string, patch: WeekPatch) => {
    const res = await fetch(`/api/kpis/weeks/${weekId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Could not save')
    await loadKpis(clientId)
  }

  const handleDeleteWeek = async (weekId: string) => {
    await fetch(`/api/kpis/weeks/${weekId}`, { method: 'DELETE' })
    await loadKpis(clientId)
  }

  const handleSyncWeek = async (kpi: Kpi, weekStart: string) => {
    const res = await fetch(`/api/kpis/${kpi.id}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekStart }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Sync failed')
    await loadKpis(clientId)
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="appearance-none text-sm bg-[#1c2232] border border-white/10 rounded-lg px-3 py-1.5 text-white focus:outline-none cursor-pointer"
        >
          {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      {kpisLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-40 bg-white/5 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {SECTIONS.map(({ id, icon: Icon }) => {
            const sectionKpis = kpis.filter(k => k.section === id).sort((a, b) => a.order - b.order)
            return (
              <div key={id} className="bg-[#1c2232] border border-white/[0.05] rounded-xl p-5">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-purple-400" />
                    <h2 className="text-sm font-semibold text-white">{id}</h2>
                  </div>
                  <button
                    onClick={() => openAdd(id)}
                    className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>

                {sectionKpis.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3">No KPIs yet — click Add to set one up.</p>
                ) : (
                  <div>
                    {sectionKpis.map((kpi, i) => (
                      <KpiRow
                        key={kpi.id}
                        kpi={kpi}
                        year={year}
                        isFirst={i === 0}
                        isLast={i === sectionKpis.length - 1}
                        onEdit={() => openEdit(kpi)}
                        onDelete={() => handleDelete(kpi)}
                        onMove={direction => handleMove(kpi, direction)}
                        onLogWeek={(weekStart, fields) => handleLogWeek(kpi, weekStart, fields)}
                        onDeleteWeek={handleDeleteWeek}
                        onSyncWeek={weekStart => handleSyncWeek(kpi, weekStart)}
                        onUpdateWeek={handleUpdateWeek}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-4">
        <CommentsSection clientId={clientId} />
      </div>

      {modalSection && (
        <KpiFormModal
          section={modalSection}
          kpi={editingKpi}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

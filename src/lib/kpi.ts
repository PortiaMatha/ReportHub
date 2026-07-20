import type { Kpi, KpiWeekValue, KpiDirection, KpiStatus } from '@/types'

const WEEKS_PER_YEAR = 52
const DAY_MS = 24 * 60 * 60 * 1000

// A client's YTD reporting period doesn't have to follow the calendar year (e.g. a client whose
// year runs Mar 26 – Feb 27). Dates are plain "YYYY-MM-DD" strings, inclusive on both ends.
export interface KpiPeriod {
  start: string
  end: string
}

export function defaultYtdPeriod(): KpiPeriod {
  const year = new Date().getFullYear()
  return { start: `${year}-01-01`, end: `${year}-12-31` }
}

export function formatPeriodLabel(period: KpiPeriod): string {
  const start = new Date(period.start)
  const end = new Date(period.end)
  const startLabel = start.toLocaleDateString('en', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' })
  const endLabel = end.toLocaleDateString('en', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' })
  return `${startLabel} – ${endLabel}`
}

export function isWeekInPeriod(weekStart: string, period: KpiPeriod): boolean {
  const t = new Date(weekStart).getTime()
  return t >= new Date(period.start).getTime() && t <= new Date(period.end).getTime()
}

export function parseNumeric(value?: string | null): number | null {
  if (!value) return null
  const cleaned = value.replace(/[^0-9.-]/g, '')
  if (!cleaned) return null
  const n = parseFloat(cleaned)
  return Number.isNaN(n) ? null : n
}

export function formatDurationSeconds(seconds?: number | null): string {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}m ${s.toString().padStart(2, '0')}s`
}

// Accepts "4m 34s", "4m", "34s", "4m34s", or a plain number of seconds.
export function parseDurationToSeconds(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const match = trimmed.match(/^(?:(\d+(?:\.\d+)?)\s*m)?\s*(?:(\d+(?:\.\d+)?)\s*s)?$/i)
  if (match && (match[1] !== undefined || match[2] !== undefined)) {
    const minutes = match[1] ? parseFloat(match[1]) : 0
    const seconds = match[2] ? parseFloat(match[2]) : 0
    return minutes * 60 + seconds
  }
  const n = parseFloat(trimmed)
  return Number.isNaN(n) ? null : n
}

function isLogged(w: KpiWeekValue): w is KpiWeekValue & { value: number } {
  return w.value !== null && w.value !== undefined
}

function weeksInYear(kpi: Kpi, year: number): KpiWeekValue[] {
  return kpi.weeklyValues.filter(w => new Date(w.weekStart).getUTCFullYear() === year)
}

function weeksInMonth(kpi: Kpi, year: number, month: number): KpiWeekValue[] {
  return kpi.weeklyValues.filter(w => {
    const d = new Date(w.weekStart)
    return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1
  })
}

function weeksInPeriod(kpi: Kpi, period: KpiPeriod): KpiWeekValue[] {
  return kpi.weeklyValues.filter(w => isWeekInPeriod(w.weekStart, period))
}

// Reduces a set of logged weeks to a single figure per the KPI's measurement type.
function aggregateWeeks(kpi: Kpi, weeks: KpiWeekValue[]): number | null {
  const logged = weeks.filter(isLogged)
  if (logged.length === 0) return null

  if (kpi.measurementType === 'cumulative') {
    return logged.reduce((sum, w) => sum + w.value, 0)
  }

  if (kpi.measurementType === 'snapshot') {
    const latest = [...logged].sort((a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime())[0]
    return latest.value
  }

  // rate & duration: weighted from raw totals, never averaged as pre-computed percentages
  const withDenom = logged.filter(w => w.denominatorValue !== null && w.denominatorValue !== undefined)
  if (withDenom.length === 0) return null
  const numeratorSum = withDenom.reduce((sum, w) => sum + w.value, 0)
  const denominatorSum = withDenom.reduce((sum, w) => sum + (w.denominatorValue as number), 0)
  if (denominatorSum === 0) return null
  const ratio = numeratorSum / denominatorSum
  return kpi.measurementType === 'rate' && kpi.unit === '%' ? ratio * 100 : ratio
}

export function computeYtdActual(kpi: Kpi, period: KpiPeriod = defaultYtdPeriod()): number | null {
  return aggregateWeeks(kpi, weeksInPeriod(kpi, period))
}

// Used by goal methods that need a specific month's total (e.g. Jan/Dec baseline average).
// Always calendar-based — the baseline-average goal method compares Jan vs Dec of a calendar year
// regardless of the client's custom YTD reporting period.
export function computeMonthTotal(kpi: Kpi, year: number, month: number): number | null {
  return aggregateWeeks(kpi, weeksInMonth(kpi, year, month))
}

// A period that's already ended is treated as fully elapsed; one that hasn't started yet as 0% elapsed.
export function getReportingDate(period: KpiPeriod = defaultYtdPeriod()): Date {
  const now = new Date()
  const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
  const start = new Date(period.start)
  const end = new Date(period.end)
  if (todayUTC.getTime() < start.getTime()) return start
  if (todayUTC.getTime() > end.getTime()) return end
  return todayUTC
}

function periodLengthDays(period: KpiPeriod): number {
  const start = new Date(period.start)
  const end = new Date(period.end)
  return Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1
}

function dayIntoPeriod(date: Date, period: KpiPeriod): number {
  const start = new Date(period.start)
  return Math.floor((date.getTime() - start.getTime()) / DAY_MS) + 1
}

function weeksRemainingInPeriod(period: KpiPeriod, reportingDate: Date): number {
  const currentWeekStart = new Date(snapToWeekStartISO(reportingDate.toISOString().slice(0, 10)))
  const lastWeekStart = new Date(snapToWeekStartISO(period.end))
  const diffWeeks = Math.round((lastWeekStart.getTime() - currentWeekStart.getTime()) / (7 * DAY_MS))
  return Math.max(0, diffWeeks)
}

// Expected YTD — only cumulative KPIs get pro-rated; rate/snapshot/duration compare Actual straight against the goal.
export function computeExpectedYtd(kpi: Kpi, period: KpiPeriod = defaultYtdPeriod()): number | null {
  const goal = parseNumeric(kpi.yearGoal)
  if (goal === null) return null
  if (kpi.measurementType !== 'cumulative') return goal

  const reportingDate = getReportingDate(period)

  if (kpi.pacingMethod === 'weekly_plan') {
    const planned = weeksInPeriod(kpi, period)
      .filter(w => new Date(w.weekStart).getTime() <= reportingDate.getTime())
      .filter(w => w.plannedTarget !== null && w.plannedTarget !== undefined)
    if (planned.length === 0) return null
    return planned.reduce((sum, w) => sum + (w.plannedTarget as number), 0)
  }

  return (goal * dayIntoPeriod(reportingDate, period)) / periodLengthDays(period)
}

export interface OverUnderResult {
  overUnder: number | null
  variancePercent: number | null
}

// Sign convention: positive always means "ahead of target", negative always means "behind" — regardless of direction.
export function computeOverUnder(kpi: Kpi, period: KpiPeriod = defaultYtdPeriod()): OverUnderResult {
  if (kpi.direction === 'range' || kpi.direction === 'informational') {
    return { overUnder: null, variancePercent: null }
  }
  const actual = computeYtdActual(kpi, period)
  const expected = computeExpectedYtd(kpi, period)
  if (actual === null || expected === null) return { overUnder: null, variancePercent: null }

  const rawDelta = actual - expected
  const sign = kpi.direction === 'lower' ? -1 : 1
  const overUnder = sign * rawDelta
  const variancePercent = expected !== 0 ? sign * (rawDelta / expected) * 100 : null
  return { overUnder, variancePercent }
}

export interface DynamicWeeklyResult {
  original: number | null
  dynamic: number | null
}

export function computeDynamicWeekly(kpi: Kpi, period: KpiPeriod = defaultYtdPeriod()): DynamicWeeklyResult {
  if (kpi.direction === 'range' || kpi.direction === 'informational') return { original: null, dynamic: null }
  const goal = parseNumeric(kpi.yearGoal)
  if (goal === null) return { original: null, dynamic: null }

  if (kpi.measurementType !== 'cumulative') return { original: goal, dynamic: goal }

  const actual = computeYtdActual(kpi, period) ?? 0
  const reportingDate = getReportingDate(period)
  const remaining = Math.max(0, goal - actual)
  const weeksRemaining = weeksRemainingInPeriod(period, reportingDate)
  const dynamic = weeksRemaining > 0 ? remaining / weeksRemaining : 0
  const original = goal / WEEKS_PER_YEAR
  return { original, dynamic }
}

// direction === 'lower' inverts the ratio so the same green/orange/red thresholds work for both directions.
export function computeAchievementRatio(actual: number | null, target: number | null, direction: KpiDirection): number | null {
  if (actual === null || target === null || target === 0) return null
  return direction === 'lower' ? target / actual : actual / target
}

export function computeStatus(ratio: number | null): KpiStatus | null {
  if (ratio === null) return null
  if (ratio >= 1) return 'green'
  if (ratio >= 0.8) return 'orange'
  return 'red'
}

export interface WeeklyResult {
  actualWeekly: number | null
  plannedWeekly: number | null
  weeklyVariance: number | null
  achievementPercent: number | null
  status: KpiStatus | null
}

export function computeWeeklyResult(kpi: Kpi, week: KpiWeekValue): WeeklyResult {
  const goal = parseNumeric(kpi.yearGoal)

  let actualWeekly: number | null
  if (kpi.measurementType === 'rate' || kpi.measurementType === 'duration') {
    if (!isLogged(week) || !week.denominatorValue) {
      actualWeekly = null
    } else {
      const ratio = week.value / week.denominatorValue
      actualWeekly = kpi.measurementType === 'rate' && kpi.unit === '%' ? ratio * 100 : ratio
    }
  } else {
    actualWeekly = week.value ?? null
  }

  let plannedWeekly: number | null
  if (kpi.measurementType === 'cumulative') {
    plannedWeekly = kpi.pacingMethod === 'weekly_plan'
      ? (week.plannedTarget ?? null)
      : (goal !== null ? goal / WEEKS_PER_YEAR : null)
  } else {
    plannedWeekly = goal
  }

  const weeklyVariance = actualWeekly !== null && plannedWeekly !== null ? actualWeekly - plannedWeekly : null
  const achievementPercent = actualWeekly !== null && plannedWeekly ? (actualWeekly / plannedWeekly) * 100 : null
  const statusRatio = computeAchievementRatio(actualWeekly, plannedWeekly, kpi.direction)
  const status = computeStatus(statusRatio)

  return { actualWeekly, plannedWeekly, weeklyVariance, achievementPercent, status }
}

// Progress bar / at-a-glance percent — direction-aware, clamped 0-100.
export function computeProgressPercent(kpi: Kpi, period: KpiPeriod = defaultYtdPeriod()): number | null {
  if (kpi.direction === 'range' || kpi.direction === 'informational') return null
  const actual = computeYtdActual(kpi, period)
  const goal = parseNumeric(kpi.yearGoal)
  const ratio = computeAchievementRatio(actual, goal, kpi.direction)
  if (ratio === null) return null
  return Math.min(100, Math.max(0, ratio * 100))
}

export interface GoalComputation {
  baseline: number
  yearGoal: number
}

// Year Goal = Baseline Monthly Average × 12, where Baseline Monthly Average = (Jan + Dec of baselineYear) ÷ 2
export function computeGoalFromBaselineAvg(kpi: Kpi, baselineYear: number): GoalComputation | null {
  const jan = computeMonthTotal(kpi, baselineYear, 1)
  const dec = computeMonthTotal(kpi, baselineYear, 12)
  if (jan === null || dec === null) return null
  const baseline = (jan + dec) / 2
  return { baseline, yearGoal: baseline * 12 }
}

// Year Goal = Previous Year Actual × (1 + Growth %)
export function computeGoalFromGrowth(kpi: Kpi, baselineYear: number, growthPercent: number): GoalComputation | null {
  const baseline = computeYtdActual(kpi, { start: `${baselineYear}-01-01`, end: `${baselineYear}-12-31` })
  if (baseline === null) return null
  return { baseline, yearGoal: baseline * (1 + growthPercent / 100) }
}

// A "week" is simply 7 days starting on whatever date the user picks — not snapped to Sunday.
// snapToWeekStartISO is kept for the internal remaining-weeks grid used by the dynamic weekly target.

export function snapToWeekStartISO(dateStr: string): string {
  const d = new Date(dateStr)
  d.setUTCDate(d.getUTCDate() - d.getUTCDay())
  return d.toISOString().slice(0, 10)
}

export function lastCompletedWeekStartISO(): string {
  const now = new Date()
  const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
  todayUTC.setUTCDate(todayUTC.getUTCDate() - 7)
  return todayUTC.toISOString().slice(0, 10)
}

export function formatWeekRange(weekStartIso: string): string {
  const start = new Date(weekStartIso)
  const end = new Date(start)
  end.setUTCDate(start.getUTCDate() + 6)
  const startLabel = start.toLocaleDateString('en', { timeZone: 'UTC', month: 'short', day: 'numeric' })
  const endLabel = end.toLocaleDateString('en', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' })
  return `${startLabel} – ${endLabel}`
}

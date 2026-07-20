export interface ClientLatestReport {
  id: string
  month: number
  year: number
  status: string
  updatedAt: string
  sessions?: number | null
  desktopPerf?: number | null
  siteHealth?: number | null
  openTasks?: number | null
}

export interface Client {
  id: string
  name: string
  domain: string
  ga4PropertyId?: string
  semrushProjectId?: string
  clickupListId?: string
  githubRepo?: string
  color: string
  createdAt: string
  updatedAt: string
  reports?: ClientLatestReport[]
}

export type KpiSection =
  | 'Web'
  | 'SEO'
  | 'Social'
  | 'Influencer Management'
  | 'Paid Media'
  | 'Account Management'
  | 'Email'
  | 'Community Management'

export type KpiMeasurementType = 'cumulative' | 'rate' | 'snapshot' | 'duration'
export type KpiDirection = 'higher' | 'lower' | 'range' | 'informational'
export type KpiGoalMethod = 'manual' | 'baseline_avg' | 'growth'
export type KpiPacingMethod = 'straight_line' | 'weekly_plan'
export type KpiSource = 'ga4' | 'semrush' | 'pagespeed' | 'clickup'
export type KpiStatus = 'green' | 'orange' | 'red'

export interface KpiWeekValue {
  id: string
  kpiId: string
  weekStart: string
  value: number | null
  denominatorValue?: number | null
  plannedTarget?: number | null
  commentary?: string | null
  createdAt: string
  updatedAt: string
}

export interface Kpi {
  id: string
  clientId: string
  section: KpiSection
  name: string
  owner?: string | null
  yearGoal?: string | null
  unit?: string | null
  measurementType: KpiMeasurementType
  direction: KpiDirection
  denominatorLabel?: string | null
  goalMethod: KpiGoalMethod
  goalBaseline?: number | null
  goalGrowthPercent?: number | null
  pacingMethod: KpiPacingMethod
  rangeLow?: number | null
  rangeHigh?: number | null
  source?: KpiSource | null
  metricKey?: string | null
  order: number
  createdAt: string
  updatedAt: string
  weeklyValues: KpiWeekValue[]
}

export interface Comment {
  id: string
  clientId: string
  author?: string | null
  text: string
  date: string
  createdAt: string
  updatedAt: string
}

export interface TopPage {
  path: string
  sessions: number
}

export interface DailySession {
  date: string  // YYYYMMDD e.g. "20240501"
  sessions: number
}

export interface AuditIssue {
  type: 'error' | 'warning' | 'info'
  description: string
  count: number
  status: string
}

export interface TaskAssignee {
  name: string
  avatar: string | null
}

export interface Task {
  id: string
  name: string
  status: string
  statusColor?: string
  priority?: string
  dueDate?: string
  url?: string
  assignees?: TaskAssignee[]
}

export interface ClickUpStatus {
  status: string
  count: number
  color: string
  orderindex: number
}

export interface GitHubRelease {
  tag: string
  name: string
  date: string
  url: string
}

export interface GitHubCommit {
  sha: string
  message: string
  author: string
  date: string
  url: string
  files?: string[]
  filesTruncated?: boolean
}

export interface CruxMetric {
  value: number
  category: 'FAST' | 'AVERAGE' | 'SLOW'
}

export interface CruxData {
  fcp?: CruxMetric
  lcp?: CruxMetric
  cls?: CruxMetric
  inp?: CruxMetric
  ttfb?: CruxMetric
}

export interface PageSpeedCrux {
  desktop?: CruxData
  mobile?: CruxData
}

export interface PageSpeedOpportunity {
  strategy: 'desktop' | 'mobile'
  id: string
  title: string
  description: string
  displayValue?: string
  category: 'performance' | 'accessibility' | 'best-practices' | 'seo'
}

export interface PageSpeedIssue {
  title: string
  description: string
  severity: 'high' | 'medium' | 'low'
  relatedFile?: string | null
}

export interface DomainChange {
  field: string
  label: string
  previous: string
  current: string
  type: 'improvement' | 'regression' | 'info'
}

export interface AIRecommendation {
  category: 'performance' | 'seo' | 'security' | 'ux' | 'content'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
}

export interface ReportData {
  id: string
  clientId: string
  client?: Client
  month: number
  year: number
  status: string

  // GA4
  sessions?: number
  sessionsDelta?: number
  totalUsers?: number
  totalUsersDelta?: number
  newUsers?: number
  newUsersDelta?: number
  avgSessionDuration?: string
  bounceRate?: number
  bounceRateDelta?: number
  topPages?: TopPage[]
  dailySessions?: DailySession[]

  // PageSpeed
  desktopPerf?: number
  desktopAccess?: number
  desktopBestPrac?: number
  desktopSeo?: number
  mobilePerf?: number
  mobileAccess?: number
  mobileBestPrac?: number
  mobileSeo?: number
  fcpDesktop?: string
  lcpDesktop?: string
  tbtDesktop?: string
  clsDesktop?: string
  speedIndexDesktop?: string
  fcpMobile?: string
  lcpMobile?: string
  tbtMobile?: string
  clsMobile?: string
  speedIndexMobile?: string
  pagespeedCrux?: PageSpeedCrux
  pagespeedOpportunities?: PageSpeedOpportunity[]
  pagespeedAiSummary?: string
  pagespeedAiIssues?: PageSpeedIssue[]

  // SEMrush
  siteHealth?: number
  errors?: number
  warnings?: number
  crawlability?: number
  httpsScore?: number
  sitePerformance?: number
  internalLinking?: number
  markup?: number
  auditIssues?: AuditIssue[]
  organicKeywords?: number
  organicTraffic?: number

  // ClickUp
  openTasks?: number
  completedTasks?: number
  inProgressTasks?: number
  tasks?: Task[]
  clickupStatusBreakdown?: ClickUpStatus[]

  // GitHub
  githubBranch?: string
  githubLastCommit?: string
  githubLastCommitMsg?: string
  githubLastCommitDate?: string
  githubCommitsThisMonth?: number
  githubOpenPRs?: number
  githubMergedPRs?: number
  githubOpenIssues?: number
  githubStars?: number
  githubReleases?: GitHubRelease[]
  githubCommits?: GitHubCommit[]

  // Domain changes
  domainChanges?: DomainChange[]

  // AI
  aiSummary?: string
  aiRecommendations?: AIRecommendation[]

  // Security
  sslExpiry?: string
  malwareStatus?: string
  firewallStatus?: string

  createdAt: string
  updatedAt: string
}

export interface DomainSnapshot {
  id: string
  clientId: string
  month: number
  year: number
  shopifyVersion?: string
  theme?: string
  themeVersion?: string
  hasOutdatedApps?: boolean
  githubBranch?: string
  githubCommit?: string
  sslExpiry?: string
  sslIssuer?: string
  cms?: string
  techStack?: string[]
  headers?: Record<string, string>
  createdAt: string
}

export interface SyncResult {
  success: boolean
  source: string
  data?: Record<string, unknown>
  error?: string
}

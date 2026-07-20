import axios from 'axios'

const PAGESPEED_API = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'

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

export interface PageSpeedOpportunity {
  strategy: 'desktop' | 'mobile'
  id: string
  title: string
  description: string
  displayValue?: string
  category: 'performance' | 'accessibility' | 'best-practices' | 'seo'
}

interface PageSpeedResult {
  performance: number
  accessibility: number
  bestPractices: number
  seo: number
  fcp: string
  lcp: string
  tbt: string
  cls: string
  speedIndex: string
  crux?: CruxData
  opportunities: PageSpeedOpportunity[]
}

interface LighthouseAudit {
  title: string
  description?: string
  displayValue?: string
  score: number | null
  scoreDisplayMode?: string
}

interface CruxApiMetric {
  percentile: number
  category: 'FAST' | 'AVERAGE' | 'SLOW'
}

function stripMarkdownLinks(text: string) {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim()
}

function extractCrux(data: { loadingExperience?: { metrics?: Record<string, CruxApiMetric> }; originLoadingExperience?: { metrics?: Record<string, CruxApiMetric> } }): CruxData | undefined {
  const metrics = data.loadingExperience?.metrics || data.originLoadingExperience?.metrics
  if (!metrics) return undefined

  const pick = (key: string, scale = 1): CruxMetric | undefined => {
    const m = metrics[key]
    return m ? { value: m.percentile / scale, category: m.category } : undefined
  }

  const crux: CruxData = {
    fcp: pick('FIRST_CONTENTFUL_PAINT_MS'),
    lcp: pick('LARGEST_CONTENTFUL_PAINT_MS'),
    cls: pick('CUMULATIVE_LAYOUT_SHIFT_SCORE', 100),
    inp: pick('INTERACTION_TO_NEXT_PAINT'),
    ttfb: pick('EXPERIMENTAL_TIME_TO_FIRST_BYTE'),
  }
  return Object.values(crux).some(Boolean) ? crux : undefined
}

function extractOpportunities(
  data: { lighthouseResult?: { audits?: Record<string, LighthouseAudit>; categories?: Record<string, { auditRefs?: { id: string }[] }> } },
  strategy: 'desktop' | 'mobile'
): PageSpeedOpportunity[] {
  const audits = data.lighthouseResult?.audits || {}
  const categories = data.lighthouseResult?.categories || {}

  const auditToCategory: Record<string, PageSpeedOpportunity['category']> = {}
  for (const [catId, cat] of Object.entries(categories)) {
    for (const ref of cat.auditRefs || []) {
      if (!(ref.id in auditToCategory)) auditToCategory[ref.id] = catId as PageSpeedOpportunity['category']
    }
  }

  return Object.entries(audits)
    .filter(([, a]) => a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== 'notApplicable' && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'manual')
    .map(([id, a]) => ({
      strategy,
      id,
      title: a.title,
      description: stripMarkdownLinks(a.description || ''),
      displayValue: a.displayValue,
      category: auditToCategory[id] || 'performance',
      score: a.score as number,
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 8)
    .map(({ score: _score, ...rest }) => rest)
}

async function runPageSpeed(url: string, strategy: 'desktop' | 'mobile'): Promise<PageSpeedResult> {
  const response = await axios.get(PAGESPEED_API, {
    params: {
      url,
      strategy,
      key: process.env.PAGESPEED_API_KEY,
      category: ['performance', 'accessibility', 'best-practices', 'seo'],
    },
    paramsSerializer: { indexes: null },
    timeout: 150000,
  })

  const data = response.data
  const cats = data.lighthouseResult?.categories
  const audits = data.lighthouseResult?.audits

  const score = (key: string) => Math.round((cats?.[key]?.score || 0) * 100)
  const displayValue = (key: string) => audits?.[key]?.displayValue || 'N/A'

  return {
    performance: score('performance'),
    accessibility: score('accessibility'),
    bestPractices: score('best-practices'),
    seo: score('seo'),
    fcp: displayValue('first-contentful-paint'),
    lcp: displayValue('largest-contentful-paint'),
    tbt: displayValue('total-blocking-time'),
    cls: displayValue('cumulative-layout-shift'),
    speedIndex: displayValue('speed-index'),
    crux: extractCrux(data),
    opportunities: extractOpportunities(data, strategy),
  }
}

export async function fetchPageSpeedData(domain: string) {
  const url = domain.startsWith('http') ? domain : `https://${domain}`

  const [desktopResult, mobileResult] = await Promise.allSettled([
    runPageSpeed(url, 'desktop'),
    runPageSpeed(url, 'mobile'),
  ])

  if (desktopResult.status === 'rejected' && mobileResult.status === 'rejected') {
    throw desktopResult.reason
  }

  const desktop = desktopResult.status === 'fulfilled' ? desktopResult.value : undefined
  const mobile = mobileResult.status === 'fulfilled' ? mobileResult.value : undefined

  const pagespeedCrux = (desktop?.crux || mobile?.crux) ? { desktop: desktop?.crux, mobile: mobile?.crux } : undefined
  const pagespeedOpportunities = [...(desktop?.opportunities || []), ...(mobile?.opportunities || [])]

  return {
    desktopPerf: desktop?.performance,
    desktopAccess: desktop?.accessibility,
    desktopBestPrac: desktop?.bestPractices,
    desktopSeo: desktop?.seo,
    fcpDesktop: desktop?.fcp,
    lcpDesktop: desktop?.lcp,
    tbtDesktop: desktop?.tbt,
    clsDesktop: desktop?.cls,
    speedIndexDesktop: desktop?.speedIndex,
    mobilePerf: mobile?.performance,
    mobileAccess: mobile?.accessibility,
    mobileBestPrac: mobile?.bestPractices,
    mobileSeo: mobile?.seo,
    fcpMobile: mobile?.fcp,
    lcpMobile: mobile?.lcp,
    tbtMobile: mobile?.tbt,
    clsMobile: mobile?.cls,
    speedIndexMobile: mobile?.speedIndex,
    pagespeedCrux,
    pagespeedOpportunities,
  }
}

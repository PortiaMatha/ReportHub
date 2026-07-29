import type { KpiSection, KpiMeasurementType, KpiDirection, KpiSource } from '@/types'

export interface KpiPreset {
  name: string
  unit?: string
  measurementType?: KpiMeasurementType
  direction?: KpiDirection
  denominatorLabel?: string
  source?: KpiSource
  metricKey?: string
}

export const KPI_PRESETS: Record<KpiSection, KpiPreset[]> = {
  Web: [
    { name: 'Sessions', measurementType: 'cumulative', direction: 'higher', source: 'ga4', metricKey: 'sessions' },
    { name: 'Avg Session Duration', unit: 's', measurementType: 'duration', direction: 'higher', denominatorLabel: 'Sessions', source: 'ga4', metricKey: 'avgSessionDuration' },
    { name: 'Bounce Rate', unit: '%', measurementType: 'rate', direction: 'lower', denominatorLabel: 'Sessions', source: 'ga4', metricKey: 'bounceRate' },
    { name: 'Site Health', unit: '%', measurementType: 'snapshot', direction: 'higher', source: 'semrush', metricKey: 'siteHealth' },
    { name: 'Desktop Performance', unit: '%', measurementType: 'snapshot', direction: 'higher', source: 'pagespeed', metricKey: 'desktopPerf' },
    { name: 'Mobile Performance', unit: '%', measurementType: 'snapshot', direction: 'higher', source: 'pagespeed', metricKey: 'mobilePerf' },
    { name: 'Organic Traffic', measurementType: 'cumulative', direction: 'higher', source: 'semrush', metricKey: 'organicTraffic' },
    { name: 'Organic Clicks', measurementType: 'cumulative', direction: 'higher' },
  ],
  SEO: [
    { name: 'Visibility Score', unit: '%', measurementType: 'snapshot', direction: 'higher' },
    { name: 'Organic Keywords', measurementType: 'snapshot', direction: 'higher', source: 'semrush', metricKey: 'organicKeywords' },
    { name: 'Organic Traffic', measurementType: 'cumulative', direction: 'higher', source: 'semrush', metricKey: 'organicTraffic' },
    { name: 'Avg Position', measurementType: 'snapshot', direction: 'lower' },
    { name: 'AI Visibility', measurementType: 'snapshot', direction: 'higher' },
  ],
  Social: [
    { name: 'Engagement Rate', unit: '%', measurementType: 'rate', direction: 'higher', denominatorLabel: 'Reach', source: 'sproutsocial', metricKey: 'engagementRate' },
    { name: 'Follower Growth', measurementType: 'cumulative', direction: 'higher', source: 'sproutsocial', metricKey: 'followerGrowth' },
    { name: 'Impressions', measurementType: 'cumulative', direction: 'higher', source: 'sproutsocial', metricKey: 'impressions' },
    { name: 'Views', measurementType: 'cumulative', direction: 'higher', source: 'sproutsocial', metricKey: 'videoViews' },
    { name: 'Saves', measurementType: 'cumulative', direction: 'higher', source: 'sproutsocial', metricKey: 'saves' },
    { name: 'Shares', measurementType: 'cumulative', direction: 'higher', source: 'sproutsocial', metricKey: 'shares' },
  ],
  'Influencer Management': [
    { name: 'Engagement Rate', unit: '%', measurementType: 'rate', direction: 'higher', denominatorLabel: 'Reach', source: 'sproutsocial', metricKey: 'engagementRate' },
    { name: 'Reach', measurementType: 'cumulative', direction: 'higher', source: 'sproutsocial', metricKey: 'reach' },
    { name: 'Impressions', measurementType: 'cumulative', direction: 'higher', source: 'sproutsocial', metricKey: 'impressions' },
    { name: 'Affiliate Driven Revenue', unit: '$', measurementType: 'cumulative', direction: 'higher' },
  ],
  'Paid Media': [
    { name: 'CPC', unit: '$', measurementType: 'rate', direction: 'lower', denominatorLabel: 'Clicks' },
    { name: 'CTR', unit: '%', measurementType: 'rate', direction: 'higher', denominatorLabel: 'Impressions' },
    { name: 'ROAS', measurementType: 'rate', direction: 'higher', denominatorLabel: 'Spend' },
    { name: 'Impressions', measurementType: 'cumulative', direction: 'higher' },
    { name: 'Clicks', measurementType: 'cumulative', direction: 'higher' },
    { name: 'Conversion Rate', unit: '%', measurementType: 'rate', direction: 'higher', denominatorLabel: 'Clicks' },
  ],
  'Account Management': [
    { name: 'Comm Strategy', measurementType: 'cumulative', direction: 'higher' },
    { name: 'Monthly Report', measurementType: 'cumulative', direction: 'higher' },
    { name: 'QBR Report', measurementType: 'cumulative', direction: 'higher' },
    { name: 'Open Tasks', measurementType: 'snapshot', direction: 'lower', source: 'clickup', metricKey: 'openTasks' },
    { name: 'Completed Tasks', measurementType: 'cumulative', direction: 'higher', source: 'clickup', metricKey: 'completedTasks' },
  ],
  Email: [
    { name: 'Open Rate', unit: '%', measurementType: 'rate', direction: 'higher', denominatorLabel: 'Sends' },
    { name: 'Click Rate', unit: '%', measurementType: 'rate', direction: 'higher', denominatorLabel: 'Delivered' },
    { name: 'Database Growth', measurementType: 'cumulative', direction: 'higher' },
  ],
  'Community Management': [
    { name: 'Sentiment Score', measurementType: 'snapshot', direction: 'higher' },
    { name: 'Total Received Messages', measurementType: 'cumulative', direction: 'higher' },
  ],
}

export const SOURCE_LABELS: Record<KpiSource, string> = {
  ga4: 'GA4',
  semrush: 'SEMrush',
  pagespeed: 'PageSpeed',
  clickup: 'ClickUp',
  sproutsocial: 'Sprout Social',
}

import axios from 'axios'
import * as cheerio from 'cheerio'
import { prisma } from '@/lib/prisma'
import type { DomainChange } from '@/types'

export async function crawlDomain(domain: string) {
  const url = domain.startsWith('http') ? domain : `https://${domain}`

  let html = ''
  let responseHeaders: Record<string, string> = {}
  let sslInfo = { expiry: '', issuer: '' }

  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: { 'User-Agent': 'ReportHub/1.0 Site Monitor' },
      validateStatus: () => true,
    })
    html = response.data || ''
    // Capture key headers
    const h = response.headers
    responseHeaders = {
      server: String(h['server'] || ''),
      'x-powered-by': String(h['x-powered-by'] || ''),
      'x-shopify-stage': String(h['x-shopify-stage'] || ''),
      'x-shopify-shop-id': String(h['x-shopify-shop-id'] || ''),
      'cf-ray': String(h['cf-ray'] || ''),
      'strict-transport-security': String(h['strict-transport-security'] || ''),
      'content-security-policy': h['content-security-policy'] ? 'present' : '',
    }
  } catch {
    // Network error — return minimal snapshot
    return { error: 'Could not reach domain' }
  }

  const $ = cheerio.load(html)

  // Detect Shopify
  let shopifyVersion = null
  let theme = null
  let themeVersion = null
  const isShopify =
    html.includes('cdn.shopify.com') ||
    html.includes('Shopify.theme') ||
    !!responseHeaders['x-shopify-stage']

  if (isShopify) {
    const themeMatch = html.match(/Shopify\.theme\s*=\s*({[^}]+})/s)
    if (themeMatch) {
      try {
        const themeObj = JSON.parse(themeMatch[1].replace(/(\w+):/g, '"$1":'))
        theme = themeObj.name || null
        themeVersion = themeObj.version || null
      } catch { /* ignore */ }
    }

    // Shopify theme schema in page source
    const schemaMatch = html.match(/"theme_version"\s*:\s*"([^"]+)"/)
    if (schemaMatch) themeVersion = schemaMatch[1]

    // Shopify version from generator meta
    const generator = $('meta[name="generator"]').attr('content') || ''
    const vMatch = generator.match(/Shopify\s+([\d.]+)/i)
    shopifyVersion = vMatch ? vMatch[1] : (isShopify ? 'detected' : null)
  }

  // Detect CMS
  let cms = 'Unknown'
  if (isShopify) cms = 'Shopify'
  else if (html.includes('wp-content') || html.includes('wp-includes')) cms = 'WordPress'
  else if (html.includes('squarespace')) cms = 'Squarespace'
  else if (html.includes('wix.com')) cms = 'Wix'

  // Tech stack detection
  const techStack: string[] = []
  if (isShopify) techStack.push('Shopify')
  if (responseHeaders['cf-ray']) techStack.push('Cloudflare')
  if (html.includes('gtag') || html.includes('googletagmanager')) techStack.push('Google Tag Manager')
  if (html.includes('fbq(') || html.includes('facebook-pixel')) techStack.push('Meta Pixel')
  if (html.includes('klaviyo')) techStack.push('Klaviyo')
  if (html.includes('hotjar')) techStack.push('Hotjar')
  if (html.includes('intercom')) techStack.push('Intercom')

  // SSL — read from headers (expiry would need TLS handshake; approximate from HSTS)
  const hsts = responseHeaders['strict-transport-security']
  sslInfo.expiry = '' // Would need a TLS lib or external check
  sslInfo.issuer = ''

  return {
    shopifyVersion,
    theme,
    themeVersion,
    hasOutdatedApps: false, // requires Shopify Admin API
    cms,
    techStack,
    headers: responseHeaders,
    sslExpiry: sslInfo.expiry,
    sslIssuer: sslInfo.issuer,
  }
}

export async function diffDomainSnapshots(
  clientId: string,
  current: Awaited<ReturnType<typeof crawlDomain>>,
  month: number,
  year: number
): Promise<DomainChange[]> {
  // Find last month's snapshot
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year

  const previous = await prisma.domainSnapshot.findUnique({
    where: { clientId_month_year: { clientId, month: prevMonth, year: prevYear } },
  })

  if (!previous) return []

  const changes: DomainChange[] = []

  const check = (
    field: string,
    label: string,
    prev: string | null | undefined,
    cur: string | null | undefined,
    type: DomainChange['type'] = 'info'
  ) => {
    const p = prev || 'N/A'
    const c = cur || 'N/A'
    if (p !== c) {
      changes.push({ field, label, previous: p, current: c, type })
    }
  }

  check('shopifyVersion', 'Shopify version', previous.shopifyVersion, current.shopifyVersion as string, 'improvement')
  check('theme', 'Theme', previous.theme, current.theme as string, 'info')
  check('themeVersion', 'Theme version', previous.themeVersion, current.themeVersion as string, 'improvement')
  check('cms', 'CMS', previous.cms, current.cms as string, 'info')

  const prevStack = JSON.parse(previous.techStack || '[]') as string[]
  const curStack = (current.techStack || []) as string[]

  const added = curStack.filter((t) => !prevStack.includes(t))
  const removed = prevStack.filter((t) => !curStack.includes(t))
  if (added.length) changes.push({ field: 'techAdded', label: 'Tech added', previous: '—', current: added.join(', '), type: 'info' })
  if (removed.length) changes.push({ field: 'techRemoved', label: 'Tech removed', previous: removed.join(', '), current: '—', type: 'info' })

  return changes
}

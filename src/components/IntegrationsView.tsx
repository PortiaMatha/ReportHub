'use client'

import { useState } from 'react'
import { BarChart2, Zap, Search, CheckSquare, Globe, Settings, ExternalLink, CheckCircle, XCircle } from 'lucide-react'
import type { Client } from '@/types'

interface Props {
  clients: Client[]
  loading: boolean
  onEditClient: (c: Client) => void
}

const DEFAULT_CLIENT_COLOR = '#534AB7'

function FaviconOrDot({ domain }: { domain: string }) {
  const [failed, setFailed] = useState(false)
  const clean = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  if (failed) {
    return <span className="w-5 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: DEFAULT_CLIENT_COLOR }} />
  }
  return (
    <img
      src={`https://icons.duckduckgo.com/ip3/${clean}.ico`}
      alt=""
      width={20}
      height={20}
      className="w-5 h-5 rounded-sm object-contain flex-shrink-0"
      onError={() => setFailed(true)}
    />
  )
}

interface Integration {
  id: 'ga4' | 'pagespeed' | 'semrush' | 'clickup'
  name: string
  description: string
  icon: React.ReactNode
  badgeType: 'live' | 'apikey' | 'builtin'
  badgeLabel: string
  getClientStatus: (c: Client) => { active: boolean; detail?: string }
}

const integrations: Integration[] = [
  {
    id: 'ga4',
    name: 'Google Analytics 4',
    description: 'Traffic, sessions, users, bounce rate, and top pages via the GA4 Data API.',
    icon: <BarChart2 className="w-5 h-5" />,
    badgeType: 'live',
    badgeLabel: 'OAuth / API',
    getClientStatus: (c) => ({
      active: !!c.ga4PropertyId,
      detail: c.ga4PropertyId ? `Property: ${c.ga4PropertyId}` : undefined,
    }),
  },
  {
    id: 'pagespeed',
    name: 'PageSpeed Insights',
    description: 'Core Web Vitals, Lighthouse scores for desktop and mobile.',
    icon: <Zap className="w-5 h-5" />,
    badgeType: 'builtin',
    badgeLabel: 'Built-in',
    getClientStatus: (c) => ({ active: !!c.domain, detail: c.domain }),
  },
  {
    id: 'semrush',
    name: 'SEMrush',
    description: 'Site health audit, errors, warnings, crawlability, and organic keywords.',
    icon: <Search className="w-5 h-5" />,
    badgeType: 'apikey',
    badgeLabel: 'API key',
    getClientStatus: (c) => ({
      active: !!c.semrushProjectId,
      detail: c.semrushProjectId ? `Project: ${c.semrushProjectId}` : undefined,
    }),
  },
  {
    id: 'clickup',
    name: 'ClickUp',
    description: 'Open, in-progress, and completed tasks from a ClickUp list.',
    icon: <CheckSquare className="w-5 h-5" />,
    badgeType: 'live',
    badgeLabel: 'API token',
    getClientStatus: (c) => ({
      active: !!c.clickupListId,
      detail: c.clickupListId ? `List: ${c.clickupListId}` : undefined,
    }),
  },
]

const badgeStyles: Record<string, string> = {
  live: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  apikey: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  builtin: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
}

export default function IntegrationsView({ clients, loading, onEditClient }: Props) {
  if (loading) {
    return (
      <div className="p-6 grid grid-cols-2 gap-4 max-w-4xl">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-64 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  const activeCount = (integration: Integration) =>
    clients.filter(c => integration.getClientStatus(c).active).length

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Integrations</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          {integrations.length} data sources · {clients.length} client{clients.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {integrations.map(integration => {
          const connected = clients.filter(c => integration.getClientStatus(c).active)
          const disconnected = clients.filter(c => !integration.getClientStatus(c).active)
          const total = clients.length

          return (
            <div
              key={integration.id}
              className="bg-[#1c2232] border border-white/[0.05] rounded-xl p-5 flex flex-col"
            >
              {/* Card header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 flex-shrink-0">
                    {integration.icon}
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">{integration.name}</h2>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed max-w-[220px]">
                      {integration.description}
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border flex-shrink-0 ${badgeStyles[integration.badgeType]}`}>
                  {integration.badgeLabel}
                </span>
              </div>

              {/* Summary bar */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500/60 rounded-full transition-all"
                    style={{ width: total > 0 ? `${(connected.length / total) * 100}%` : '0%' }}
                  />
                </div>
                <span className="text-xs text-slate-500 flex-shrink-0">
                  {connected.length}/{total} active
                </span>
              </div>

              {/* Client list */}
              <div className="flex-1 space-y-1">
                {clients.length === 0 && (
                  <p className="text-xs text-slate-600 italic">No clients yet</p>
                )}
                {connected.map(client => {
                  const { detail } = integration.getClientStatus(client)
                  return (
                    <div
                      key={client.id}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/[0.04] group transition-colors"
                    >
                      <FaviconOrDot domain={client.domain} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white font-medium truncate">{client.name}</div>
                        {detail && (
                          <div className="text-[11px] text-slate-500 font-mono truncate">{detail}</div>
                        )}
                      </div>
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      <button
                        onClick={() => onEditClient(client)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-500 hover:text-white hover:bg-white/10 transition-all"
                        title="Edit client settings"
                      >
                        <Settings className="w-3 h-3" />
                      </button>
                    </div>
                  )
                })}
                {disconnected.map(client => (
                  <div
                    key={client.id}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/[0.04] group transition-colors opacity-50"
                  >
                    <FaviconOrDot domain={client.domain} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-400 truncate">{client.name}</div>
                      <div className="text-[11px] text-slate-600 truncate">Not configured</div>
                    </div>
                    <XCircle className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                    <button
                      onClick={() => onEditClient(client)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-500 hover:text-white hover:bg-white/10 transition-all"
                      title="Configure integration"
                    >
                      <Settings className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Footer */}
              {disconnected.length > 0 && (
                <div className="mt-4 pt-3 border-t border-white/[0.05]">
                  <p className="text-[11px] text-slate-600">
                    {disconnected.length} client{disconnected.length !== 1 ? 's' : ''} not connected — click{' '}
                    <Settings className="w-3 h-3 inline-block -mt-0.5" /> to configure
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* PageSpeed note */}
      <div className="mt-4 flex items-start gap-2.5 text-xs text-slate-600 px-1">
        <Globe className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <span>PageSpeed Insights runs on every client domain automatically — no API key required.</span>
      </div>

      {/* External links */}
      <div className="mt-5 flex gap-3">
        {[
          { label: 'GA4 Console', href: 'https://analytics.google.com' },
          { label: 'SEMrush', href: 'https://www.semrush.com' },
          { label: 'ClickUp', href: 'https://app.clickup.com' },
        ].map(link => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-purple-400 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            {link.label}
          </a>
        ))}
      </div>
    </div>
  )
}

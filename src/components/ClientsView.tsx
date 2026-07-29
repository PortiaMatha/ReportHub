'use client'

import { useState } from 'react'
import { Plus, Settings, Download, ArrowRight, Globe, BarChart2, Zap, Search, CheckSquare, FileText } from 'lucide-react'
import type { Client } from '@/types'

interface Props {
  clients: Client[]
  loading: boolean
  onEditClient: (c: Client) => void
  onSelectClient: (c: Client) => void
  onAddClient: () => void
}

const DEFAULT_CLIENT_COLOR = '#534AB7'

function FaviconOrGlobe({ domain }: { domain: string }) {
  const [failed, setFailed] = useState(false)
  const clean = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  if (failed) {
    return (
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: DEFAULT_CLIENT_COLOR + '22' }}>
        <Globe className="w-5 h-5" style={{ color: DEFAULT_CLIENT_COLOR }} />
      </div>
    )
  }
  return (
    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 overflow-hidden">
      <img
        src={`https://icons.duckduckgo.com/ip3/${clean}.ico`}
        alt=""
        width={24}
        height={24}
        className="w-6 h-6 object-contain"
        onError={() => setFailed(true)}
      />
    </div>
  )
}

function StatChip({ icon, label, value, ok }: { icon: React.ReactNode; label: string; value: string; ok: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1 text-[10px] text-slate-500 uppercase tracking-wide font-medium">
        <span className={ok ? 'text-slate-400' : 'text-slate-600'}>{icon}</span>
        {label}
      </div>
      <span className={`text-sm font-semibold ${ok ? 'text-white' : 'text-slate-600'}`}>{value}</span>
    </div>
  )
}

export default function ClientsView({ clients, loading, onEditClient, onSelectClient, onAddClient }: Props) {
  if (loading) {
    return (
      <div className="p-6 grid grid-cols-1 gap-4 max-w-4xl">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-40 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Clients</h1>
          <p className="text-sm text-slate-400 mt-0.5">{clients.length} client{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={onAddClient}
          className="flex items-center gap-2 text-sm bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add client
        </button>
      </div>

      {clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center mb-4">
            <Globe className="w-7 h-7 text-purple-400" />
          </div>
          <h3 className="text-base font-semibold text-white mb-2">No clients yet</h3>
          <p className="text-sm text-slate-400 mb-5 max-w-xs">Add your first client to start generating reports.</p>
          <button
            onClick={onAddClient}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add client
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map(client => {
            const latest = client.reports?.[0]
            const monthName = latest
              ? new Date(latest.year, latest.month - 1).toLocaleString('en', { month: 'long', year: 'numeric' })
              : null

            return (
              <div
                key={client.id}
                className="bg-[#1c2232] border border-white/[0.05] rounded-xl p-5 hover:border-white/10 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Favicon / icon */}
                  <FaviconOrGlobe domain={client.domain} />

                  {/* Client info + stats */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h2 className="text-base font-semibold text-white">{client.name}</h2>
                        <a
                          href={`https://${client.domain.replace(/^https?:\/\//, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-xs text-slate-500 hover:text-purple-400 transition-colors font-mono"
                        >
                          {client.domain}
                        </a>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Integration badges */}
                        <IntegrationBadge label="GA4" active={!!client.ga4PropertyId} />
                        <IntegrationBadge label="SEMrush" active={!!client.semrushProjectId} />
                        <IntegrationBadge label="ClickUp" active={!!client.clickupListId} />
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-6 mb-4">
                      <StatChip
                        icon={<BarChart2 className="w-3 h-3" />}
                        label="Sessions"
                        value={latest?.sessions ? (latest.sessions >= 1000 ? `${(latest.sessions / 1000).toFixed(0)}K` : String(latest.sessions)) : '—'}
                        ok={!!latest?.sessions}
                      />
                      <StatChip
                        icon={<Zap className="w-3 h-3" />}
                        label="Desktop"
                        value={latest?.desktopPerf ? `${latest.desktopPerf}` : '—'}
                        ok={!!latest?.desktopPerf}
                      />
                      <StatChip
                        icon={<Search className="w-3 h-3" />}
                        label="Site health"
                        value={latest?.siteHealth ? `${latest.siteHealth}%` : '—'}
                        ok={!!latest?.siteHealth}
                      />
                      <StatChip
                        icon={<CheckSquare className="w-3 h-3" />}
                        label="Open tasks"
                        value={latest?.openTasks !== undefined && latest?.openTasks !== null ? String(latest.openTasks) : '—'}
                        ok={latest?.openTasks !== undefined && latest?.openTasks !== null}
                      />
                      {monthName && (
                        <div className="ml-auto flex-shrink-0">
                          <span className="text-[10px] text-slate-600 font-medium">Last report: {monthName}</span>
                        </div>
                      )}
                    </div>

                    {/* Action row */}
                    <div className="flex items-center gap-2 pt-3 border-t border-white/[0.05]">
                      {latest?.id ? (
                        <>
                          <a
                            href={`/api/reports/${latest.id}/pdf`}
                            download
                            className="flex items-center gap-1.5 text-xs border border-white/10 rounded-lg px-3 py-1.5 text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Download PDF
                          </a>
                          <a
                            href={`/api/reports/${latest.id}/docx`}
                            download
                            className="flex items-center gap-1.5 text-xs border border-white/10 rounded-lg px-3 py-1.5 text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download Doc
                          </a>
                        </>
                      ) : (
                        <span className="text-xs text-slate-600 italic">No report yet — sync from the Reports view</span>
                      )}
                      <div className="ml-auto flex items-center gap-2">
                        <button
                          onClick={() => onEditClient(client)}
                          className="flex items-center gap-1.5 text-xs border border-white/10 rounded-lg px-3 py-1.5 text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          Edit settings
                        </button>
                        <button
                          onClick={() => onSelectClient(client)}
                          className="flex items-center gap-1.5 text-xs bg-purple-600/15 border border-purple-500/20 rounded-lg px-3 py-1.5 text-purple-300 hover:bg-purple-600/25 transition-colors"
                        >
                          View report
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function IntegrationBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${active ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-white/5 text-slate-600 border border-white/5'}`}>
      {label}
    </span>
  )
}

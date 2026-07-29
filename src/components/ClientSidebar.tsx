'use client'

import { useState } from 'react'
import React from 'react'
import { Plus, Settings, BarChart2, Users, Plug2, Cog, LayoutDashboard } from 'lucide-react'
import type { Client } from '@/types'
import type { ActiveView } from '@/app/page'
import Logo from './Logo'

const DEFAULT_CLIENT_COLOR = '#534AB7'

function FaviconOrDot({ domain }: { domain: string }) {
  const [failed, setFailed] = useState(false)
  const clean = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  if (failed) {
    return <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: DEFAULT_CLIENT_COLOR }} />
  }
  return (
    <img
      src={`https://icons.duckduckgo.com/ip3/${clean}.ico`}
      alt=""
      width={14}
      height={14}
      className="w-3.5 h-3.5 rounded-sm object-contain flex-shrink-0"
      onError={() => setFailed(true)}
    />
  )
}

interface Props {
  clients: Client[]
  selectedClient: Client | null
  onSelectClient: (c: Client) => void
  onAddClient: () => void
  onEditClient: (c: Client) => void
  loading: boolean
  activeView: ActiveView
  onChangeView: (view: ActiveView) => void
}

const menuItems: { icon: React.ElementType; label: string; view: ActiveView }[] = [
  { icon: BarChart2, label: 'Reports', view: 'reports' },
  { icon: Users, label: 'Clients', view: 'clients' },
  { icon: Plug2, label: 'Integrations', view: 'integrations' },
  { icon: Cog, label: 'Settings', view: 'settings' },
]

export default function ClientSidebar({
  clients, selectedClient, onSelectClient, onAddClient, onEditClient, loading, activeView, onChangeView
}: Props) {
  return (
    <aside className="w-52 flex flex-col bg-[#0e1117] border-r border-white/[0.06] flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-[18px] border-b border-white/[0.06] flex items-center gap-2">
        <Logo className="w-5 h-5 text-purple-400 flex-shrink-0" />
        <span className="font-bold text-base text-white tracking-tight">
          <span className="text-purple-400">Report</span>Hub
        </span>
      </div>

      {/* OVERVIEW button */}
      <div className="px-3 pt-4 pb-2">
        <button
          onClick={() => onChangeView('overview')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
            activeView === 'overview'
              ? 'bg-purple-600/15 text-purple-300 font-medium'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
          Overview
        </button>
      </div>

      <div className="mx-4 border-t border-white/[0.06]" />

      {/* MENU section */}
      <nav className="px-3 pt-3 pb-2">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2">Menu</div>
        <ul className="space-y-0.5">
          {menuItems.map(item => (
            <li key={item.label}>
              <button
                onClick={() => onChangeView(item.view)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeView === item.view
                    ? 'bg-purple-600/15 text-purple-300 font-medium'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mx-4 border-t border-white/[0.06]" />

      {/* CLIENTS section */}
      <div className="flex-1 overflow-y-auto px-3">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2">Clients</div>

        {loading ? (
          <div className="space-y-1 px-1">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-8 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : clients.length === 0 ? (
          <p className="text-xs text-slate-500 px-2">No clients yet</p>
        ) : (
          <ul className="space-y-0.5">
            {clients.map((client) => (
              <li key={client.id}>
                <button
                  onClick={() => onSelectClient(client)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors group ${
                    selectedClient?.id === client.id
                      ? 'bg-purple-600/15 text-white font-medium'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <FaviconOrDot domain={client.domain} />
                  <span className="flex-1 text-left truncate">{client.name}</span>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); onEditClient(client) }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onEditClient(client) } }}
                    className="opacity-0 group-hover:opacity-50 hover:!opacity-100 p-0.5 transition-opacity cursor-pointer"
                  >
                    <Settings className="w-3 h-3" />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add client */}
      <div className="p-3 border-t border-white/[0.06]">
        <button
          onClick={onAddClient}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add client
        </button>
      </div>
    </aside>
  )
}

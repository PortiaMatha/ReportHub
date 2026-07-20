'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Client } from '@/types'
import ClientSidebar from '@/components/ClientSidebar'
import ReportView from '@/components/ReportView'
import ClientsView from '@/components/ClientsView'
import IntegrationsView from '@/components/IntegrationsView'
import OverviewView from '@/components/OverviewView'
import SettingsView from '@/components/SettingsView'
import ClientForm from '@/components/ClientForm'
import ProfileDropdown from '@/components/ProfileDropdown'
import { Globe } from 'lucide-react'

export type ActiveView = 'overview' | 'reports' | 'clients' | 'integrations' | 'settings'

export default function Dashboard() {
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [showClientForm, setShowClientForm] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<ActiveView>('reports')

  const loadClients = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/clients')
      const data = await res.json()
      setClients(data)
      if (data.length > 0 && !selectedClient) {
        setSelectedClient(data[0])
      } else if (selectedClient) {
        const fresh = data.find((c: Client) => c.id === selectedClient.id)
        if (fresh) setSelectedClient(fresh)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [selectedClient])

  useEffect(() => { loadClients() }, [])

  const handleClientSaved = async () => {
    await loadClients()
    setShowClientForm(false)
    setEditingClient(null)
  }

  const handleEditClient = (c: Client) => {
    setEditingClient(c)
    setShowClientForm(true)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#131821]">
      {/* Profile dropdown — fixed top-right of main content */}
      <div className="fixed top-3 right-4 z-40">
        <ProfileDropdown
          onSettings={() => setActiveView('settings')}
          onProfile={() => setActiveView('settings')}
        />
      </div>

      <ClientSidebar
        clients={clients}
        selectedClient={selectedClient}
        onSelectClient={(c) => { setSelectedClient(c); setActiveView('reports') }}
        onAddClient={() => setShowClientForm(true)}
        onEditClient={handleEditClient}
        loading={loading}
        activeView={activeView}
        onChangeView={setActiveView}
      />

      <div className="flex-1 overflow-y-auto">
        {activeView === 'overview' ? (
          <OverviewView
            clients={clients}
            onSelectClient={(c) => { setSelectedClient(c); setActiveView('reports') }}
          />
        ) : activeView === 'clients' ? (
          <ClientsView
            clients={clients}
            loading={loading}
            onEditClient={handleEditClient}
            onSelectClient={(c) => { setSelectedClient(c); setActiveView('reports') }}
            onAddClient={() => setShowClientForm(true)}
          />
        ) : activeView === 'integrations' ? (
          <IntegrationsView
            clients={clients}
            loading={loading}
            onEditClient={handleEditClient}
          />
        ) : activeView === 'settings' ? (
          <SettingsView />
        ) : selectedClient ? (
          <ReportView client={selectedClient} />
        ) : (
          <EmptyState onAdd={() => setShowClientForm(true)} />
        )}
      </div>

      {showClientForm && (
        <ClientForm
          client={editingClient}
          onSave={handleClientSaved}
          onClose={() => { setShowClientForm(false); setEditingClient(null) }}
        />
      )}
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="w-16 h-16 rounded-2xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center mb-4">
        <Globe className="w-8 h-8 text-purple-400" />
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">No clients yet</h2>
      <p className="text-slate-400 mb-6 max-w-sm text-sm">
        Add your first client to start generating automated monthly reports.
      </p>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
      >
        Add first client
      </button>
    </div>
  )
}

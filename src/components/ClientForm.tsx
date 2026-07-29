'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { Client } from '@/types'

interface Props {
  client: Client | null
  onSave: () => void
  onClose: () => void
}

export default function ClientForm({ client, onSave, onClose }: Props) {
  const [form, setForm] = useState({
    name: client?.name || '',
    domain: client?.domain || '',
    ga4PropertyId: client?.ga4PropertyId || '',
    semrushProjectId: client?.semrushProjectId || '',
    clickupListId: client?.clickupListId || '',
    githubRepo: client?.githubRepo || '',
    sproutProfileIds: client?.sproutProfileIds?.join(', ') || '',
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteMode, setDeleteMode] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    if (!client) return
    setDeleting(true)
    setError('')
    try {
      const res = await fetch(`/api/clients/${client.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      onSave()
    } catch {
      setError('Failed to delete client')
    } finally {
      setDeleting(false)
    }
  }

  const handleSubmit = async () => {
    if (!form.name || !form.domain) { setError('Name and domain are required'); return }
    setSaving(true)
    setError('')
    try {
      const cleanDomain = form.domain.replace(/^https?:\/\//, '').replace(/\/+$/, '')
      const sproutProfileIds = form.sproutProfileIds.split(',').map(s => s.trim()).filter(Boolean)
      const url = client ? `/api/clients/${client.id}` : '/api/clients'
      const method = client ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, domain: cleanDomain, sproutProfileIds }),
      })
      if (!res.ok) throw new Error('Failed to save')
      onSave()
    } catch (e) {
      setError('Failed to save client')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1c2232] border border-white/[0.08] rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="font-semibold text-white">{client ? 'Edit client' : 'Add new client'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <Field label="Client name *" value={form.name} onChange={(v) => setForm(f => ({...f, name: v}))} placeholder="Ina Paarman" />
          <Field label="Domain *" value={form.domain} onChange={(v) => setForm(f => ({...f, domain: v}))} placeholder="www.paarman.co.za" />

          <div className="border-t border-white/[0.06] pt-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Integrations</div>
            <div className="space-y-3">
              <Field label="GA4 Property ID" value={form.ga4PropertyId} onChange={(v) => setForm(f => ({...f, ga4PropertyId: v}))} placeholder="123456789" />
              <Field label="SEMrush Project ID" value={form.semrushProjectId} onChange={(v) => setForm(f => ({...f, semrushProjectId: v}))} placeholder="project-id" />
              <Field label="ClickUp List ID" value={form.clickupListId} onChange={(v) => setForm(f => ({...f, clickupListId: v}))} placeholder="901234567" />
              <Field label="GitHub Repo" value={form.githubRepo} onChange={(v) => setForm(f => ({...f, githubRepo: v}))} placeholder="owner/repo" />
              <Field label="Sprout Social Profile IDs (comma-separated)" value={form.sproutProfileIds} onChange={(v) => setForm(f => ({...f, sproutProfileIds: v}))} placeholder="6125162, 6125163, 6125164" />
            </div>
          </div>

          {client && (
            <div className="border-t border-white/[0.06] pt-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={deleteMode}
                  onChange={e => { setDeleteMode(e.target.checked); setError('') }}
                  className="w-4 h-4 rounded border-white/20 bg-white/[0.04] accent-red-500 cursor-pointer"
                />
                <span className={`text-sm transition-colors ${deleteMode ? 'text-red-400' : 'text-slate-500 group-hover:text-slate-400'}`}>
                  I want to remove this client
                </span>
              </label>
              {deleteMode && (
                <p className="text-xs text-red-400/70 mt-2 ml-7">
                  This will permanently delete the client and all their reports.
                </p>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="flex gap-2 px-6 pb-5">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-white/10 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">Cancel</button>
          <button
            onClick={deleteMode ? handleDelete : handleSubmit}
            disabled={saving || deleting}
            className={`flex-1 px-4 py-2 text-sm text-white rounded-lg font-medium disabled:opacity-50 transition-colors ${
              deleteMode
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            {deleting ? 'Deleting…' : saving ? 'Saving…' : deleteMode ? 'Delete client' : client ? 'Save changes' : 'Add client'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
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

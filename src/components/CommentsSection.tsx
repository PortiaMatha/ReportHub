'use client'

import { useState, useEffect, useCallback } from 'react'
import { MessageSquare, Pencil, Trash2 } from 'lucide-react'
import type { Comment } from '@/types'

function todayISO(): string {
  const d = new Date()
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' })
}

function CommentForm({ initial, onSubmit, onCancel, submitLabel }: {
  initial?: { author: string; text: string; date: string }
  onSubmit: (data: { author: string; text: string; date: string }) => Promise<void>
  onCancel?: () => void
  submitLabel: string
}) {
  const [author, setAuthor] = useState(initial?.author || '')
  const [text, setText] = useState(initial?.text || '')
  const [date, setDate] = useState(initial?.date || todayISO())
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!text.trim()) return
    setSaving(true)
    try {
      await onSubmit({ author, text: text.trim(), date })
      if (!initial) { setText(''); setAuthor(''); setDate(todayISO()) }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Add a comment or note…"
        rows={2}
        className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 transition-colors resize-none"
      />
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={author}
          onChange={e => setAuthor(e.target.value)}
          placeholder="Owner"
          className="w-32 bg-white/[0.04] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 transition-colors"
        />
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="bg-white/[0.04] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500/50 transition-colors"
        />
        <div className="ml-auto flex items-center gap-2">
          {onCancel && (
            <button onClick={onCancel} className="text-xs text-slate-400 hover:text-white px-2 py-1.5 transition-colors">Cancel</button>
          )}
          <button
            onClick={handleSubmit}
            disabled={saving || !text.trim()}
            className="text-xs bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            {saving ? 'Saving…' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CommentsSection({ clientId }: { clientId: string }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const loadComments = useCallback(async (id: string) => {
    if (!id) { setComments([]); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/clients/${id}/comments`)
      const data = await res.json()
      setComments(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadComments(clientId) }, [clientId, loadComments])

  const handleAdd = async (data: { author: string; text: string; date: string }) => {
    await fetch(`/api/clients/${clientId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    await loadComments(clientId)
  }

  const handleEdit = async (id: string, data: { author: string; text: string; date: string }) => {
    await fetch(`/api/comments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setEditingId(null)
    await loadComments(clientId)
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/comments/${id}`, { method: 'DELETE' })
    await loadComments(clientId)
  }

  return (
    <div className="bg-[#1c2232] border border-white/[0.05] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-4 h-4 text-purple-400" />
        <h2 className="text-sm font-semibold text-white">Comments</h2>
      </div>

      <CommentForm onSubmit={handleAdd} submitLabel="Add comment" />

      {loading ? (
        <div className="mt-4 space-y-2">
          {[1, 2].map(i => <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />)}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-slate-500 mt-4">No comments yet.</p>
      ) : (
        <div className="mt-4 space-y-1">
          {comments.map(c => (
            <div key={c.id} className="py-3 border-t border-white/[0.05] first:border-t-0 group">
              {editingId === c.id ? (
                <CommentForm
                  initial={{ author: c.author || '', text: c.text, date: c.date.slice(0, 10) }}
                  submitLabel="Save"
                  onCancel={() => setEditingId(null)}
                  onSubmit={data => handleEdit(c.id, data)}
                />
              ) : (
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                      <span>{formatDate(c.date)}</span>
                      {c.author && <span className="bg-white/5 rounded px-1.5 py-0.5 text-[10px]">{c.author}</span>}
                    </div>
                    <p className="text-sm text-slate-200 whitespace-pre-wrap">{c.text}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={() => setEditingId(c.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

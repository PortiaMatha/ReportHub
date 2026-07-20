'use client'

import { useState, useRef } from 'react'
import { Camera, Eye, EyeOff, RefreshCw, AlertTriangle } from 'lucide-react'

type Tab = 'profile' | 'company' | 'security' | 'notifications' | 'billing' | 'danger'

const TABS: { id: Tab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'company', label: 'Company' },
  { id: 'security', label: 'Security' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'billing', label: 'Billing' },
  { id: 'danger', label: 'Danger zone' },
]

const TIMEZONES = [
  'Africa/Johannesburg (UTC+2)',
  'Europe/London (UTC+0)',
  'America/New_York (UTC-5)',
  'America/Los_Angeles (UTC-8)',
  'Asia/Singapore (UTC+8)',
  'Australia/Sydney (UTC+11)',
]

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-purple-600' : 'bg-white/10'}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
    </button>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full bg-[#131821] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 transition-colors ${props.className ?? ''}`}
    />
  )
}

function Select({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full appearance-none bg-[#131821] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors cursor-pointer"
    >
      {children}
    </select>
  )
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1c2232] border border-white/[0.05] rounded-xl p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
      </div>
      {children}
    </div>
  )
}

function Divider() {
  return <div className="border-t border-white/[0.05] my-5" />
}

function passwordStrength(pw: string): { label: string; color: string; width: string } {
  if (!pw) return { label: '', color: '', width: '0%' }
  const score =
    (pw.length >= 8 ? 1 : 0) +
    (/[A-Z]/.test(pw) ? 1 : 0) +
    (/[0-9]/.test(pw) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(pw) ? 1 : 0)
  if (score <= 1) return { label: 'Weak', color: 'bg-red-500', width: '25%' }
  if (score === 2) return { label: 'Fair', color: 'bg-amber-500', width: '50%' }
  if (score === 3) return { label: 'Good', color: 'bg-yellow-400', width: '75%' }
  return { label: 'Strong', color: 'bg-emerald-500', width: '100%' }
}

// ─── Profile Tab ─────────────────────────────────────────────────────────────

function ProfileTab() {
  const [firstName, setFirstName] = useState('Liam')
  const [lastName, setLastName] = useState('Whitfield')
  const [email, setEmail] = useState('liam@magnopas.studio')
  const [role, setRole] = useState('Brand strategist')
  const [avatar, setAvatar] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()

  return (
    <Section title="Profile" description="This is how your name appears in the app and on exported reports.">
      {/* Avatar */}
      <div className="flex items-center gap-5 mb-6">
        <div className="relative">
          {avatar
            ? <img src={avatar} alt="avatar" className="w-16 h-16 rounded-full object-cover border border-white/10" />
            : <div className="w-16 h-16 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold text-xl">{initials || '?'}</div>
          }
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#1c2232] border border-white/10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <Camera className="w-3 h-3 text-slate-400" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => {
            const file = e.target.files?.[0]
            if (file) setAvatar(URL.createObjectURL(file))
          }} />
        </div>
        <button onClick={() => fileRef.current?.click()} className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
          Change photo
        </button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="First name">
            <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" />
          </Field>
          <Field label="Last name">
            <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" />
          </Field>
        </div>
        <Field label="Email address">
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
          <p className="text-xs text-slate-500 mt-1.5">We&apos;ll email you here for day-in-colour and report-ready notifications.</p>
        </Field>
        <Field label="Role / Title">
          <Input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Brand strategist" />
        </Field>
      </div>
    </Section>
  )
}

// ─── Company Tab ─────────────────────────────────────────────────────────────

function CompanyTab() {
  const [companyName, setCompanyName] = useState('MagCompany.Studio')
  const [website, setWebsite] = useState('magnopas.studio')
  const [timezone, setTimezone] = useState(TIMEZONES[0])
  const [reportDay, setReportDay] = useState('1st of each month')
  const [letterhead, setLetterhead] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <Section title="Company" description="Shown in the header of every exported PDF and Doc report.">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Company name">
            <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Your company" />
          </Field>
          <Field label="Website">
            <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="yoursite.com" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Time zone">
            <Select value={timezone} onChange={setTimezone}>
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </Select>
          </Field>
          <Field label="Report day">
            <Select value={reportDay} onChange={setReportDay}>
              {['1st of each month', '15th of each month', 'Last day of month'].map(d => <option key={d} value={d}>{d}</option>)}
            </Select>
            <p className="text-xs text-slate-500 mt-1.5">Reports auto-sync on this day.</p>
          </Field>
        </div>

        <Divider />

        <Field label="Report letterhead">
          <div className="flex items-center gap-4">
            <div className="w-20 h-12 rounded-lg bg-[#131821] border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
              {letterhead
                ? <img src={letterhead} alt="letterhead" className="w-full h-full object-contain" />
                : <span className="text-xs text-slate-600">No logo</span>}
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-2">PNG/SVG, max 1MB, transparent background</p>
              <div className="flex gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="text-xs border border-white/10 rounded-lg px-3 py-1.5 text-slate-300 hover:bg-white/5 transition-colors"
                >
                  {letterhead ? 'Replace' : 'Upload'}
                </button>
                {letterhead && (
                  <button
                    onClick={() => setLetterhead(null)}
                    className="text-xs border border-red-500/20 rounded-lg px-3 py-1.5 text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => {
                const file = e.target.files?.[0]
                if (file) setLetterhead(URL.createObjectURL(file))
              }} />
            </div>
          </div>
        </Field>
      </div>
    </Section>
  )
}

// ─── Security Tab ─────────────────────────────────────────────────────────────

function SecurityTab() {
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [updating, setUpdating] = useState(false)

  const strength = passwordStrength(newPw)
  const mismatch = confirmPw && newPw !== confirmPw

  const handleUpdate = async () => {
    setUpdating(true)
    await new Promise(r => setTimeout(r, 1000))
    setCurrentPw(''); setNewPw(''); setConfirmPw('')
    setUpdating(false)
  }

  return (
    <div className="space-y-4">
      <Section title="Security" description="Password & two-factor authentication">
        {/* Password */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-white">Password</p>
            <p className="text-xs text-slate-500 mt-0.5">Last changed 5 months ago</p>
          </div>
        </div>

        <div className="space-y-3">
          <Field label="Current password">
            <div className="relative">
              <Input
                type={showCurrent ? 'text' : 'password'}
                value={currentPw}
                onChange={e => setCurrentPw(e.target.value)}
                placeholder="••••••••••••"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="New password">
              <div className="relative">
                <Input
                  type={showNew ? 'text' : 'password'}
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  placeholder="At least 12 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>
            <Field label="Confirm new">
              <Input
                type="password"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                placeholder="Re-type new password"
                className={mismatch ? 'border-red-500/50' : ''}
              />
            </Field>
          </div>

          {/* Strength bar */}
          {newPw && (
            <div>
              <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden mb-1">
                <div className={`h-full rounded-full transition-all ${strength.color}`} style={{ width: strength.width }} />
              </div>
              <p className="text-xs text-slate-500">{strength.label}</p>
            </div>
          )}

          {mismatch && <p className="text-xs text-red-400">Passwords don&apos;t match</p>}

          <button
            onClick={handleUpdate}
            disabled={updating || !currentPw || !newPw || !!mismatch}
            className="flex items-center gap-2 text-sm bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            {updating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            {updating ? 'Updating…' : 'Update password'}
          </button>
        </div>

        <Divider />

        {/* 2FA */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">Two-factor authentication</p>
            <p className="text-xs text-slate-500 mt-0.5">Register to enable. Currently using an authenticator app.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-white/[0.05]">
              Disabled
            </span>
            <button className="text-xs border border-white/10 rounded-lg px-3 py-1.5 text-slate-300 hover:bg-white/5 transition-colors">
              Manage
            </button>
          </div>
        </div>

        <Divider />

        {/* Sessions */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">Active sessions</p>
            <p className="text-xs text-slate-500 mt-0.5">2 devices: MacBook (this device), iPhone</p>
          </div>
          <button className="text-xs border border-white/10 rounded-lg px-3 py-1.5 text-slate-300 hover:bg-white/5 transition-colors whitespace-nowrap">
            Sign out other sessions
          </button>
        </div>
      </Section>
    </div>
  )
}

// ─── Notifications Tab ────────────────────────────────────────────────────────

const NOTIF_ITEMS = [
  { key: 'monthly', label: 'Monthly report ready', description: 'When a new report is generated for any client' },
  { key: 'sync', label: 'Sync errors', description: 'When a data sync fails for GA4, PageSpeed, SEMrush or ClickUp' },
  { key: 'domain', label: 'Domain change detected', description: 'When a tracked domain changes tech stack, CMS or headers' },
  { key: 'ssl', label: 'SSL expiry approaching', description: 'When a client\'s SSL certificate expires within 30 days' },
  { key: 'news', label: 'Product news & updates', description: 'New features, improvements and announcements from ReportHub' },
]

function NotificationsTab() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    monthly: true, sync: true, domain: true, ssl: true, news: false,
  })

  return (
    <Section title="Notifications" description="When ReportHub should email you">
      <div className="space-y-1">
        {NOTIF_ITEMS.map((item, i) => (
          <div key={item.key}>
            {i > 0 && <div className="border-t border-white/[0.05] my-4" />}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-white">{item.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
              </div>
              <Toggle
                checked={prefs[item.key]}
                onChange={v => setPrefs(p => ({ ...p, [item.key]: v }))}
              />
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ─── Billing Tab ──────────────────────────────────────────────────────────────

function BillingTab() {
  return (
    <Section title="Billing" description="Manage your subscription and payment details.">
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-12 h-12 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center mb-3">
          <span className="text-purple-400 text-xl">💳</span>
        </div>
        <p className="text-sm text-white font-medium mb-1">Pro plan — $49/mo</p>
        <p className="text-xs text-slate-500 mb-4">Next billing date: 1 June 2026</p>
        <button className="text-xs border border-white/10 rounded-lg px-4 py-2 text-slate-300 hover:bg-white/5 transition-colors">
          Manage subscription
        </button>
      </div>
    </Section>
  )
}

// ─── Danger Zone Tab ─────────────────────────────────────────────────────────

function DangerTab() {
  const [confirm, setConfirm] = useState('')
  const PHRASE = 'delete my account'

  return (
    <Section title="Danger zone">
      <div className="space-y-5">
        <div className="flex items-start gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-400 mb-1">Delete account</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Permanently delete your account and all data including clients, reports, and integrations. This cannot be undone.
            </p>
          </div>
        </div>
        <Field label={`Type "${PHRASE}" to confirm`}>
          <Input
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder={PHRASE}
          />
        </Field>
        <button
          disabled={confirm !== PHRASE}
          className="flex items-center gap-2 text-sm bg-red-600 hover:bg-red-700 disabled:opacity-30 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Delete account permanently
        </button>
      </div>
    </Section>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function SettingsView() {
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-full flex flex-col">
      {/* Header */}
      <div className="px-8 pt-7 pb-6 border-b border-white/[0.06] flex items-start justify-between pr-20">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-sm text-slate-400 mt-1">Manage your account, company details, and security</p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={() => {}}
            className="text-sm border border-white/10 rounded-lg px-4 py-2 text-slate-300 hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className={`text-sm rounded-lg px-4 py-2 font-medium transition-colors ${saved ? 'bg-emerald-600 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
          >
            {saved ? 'Saved!' : 'Save changes'}
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="px-8 border-b border-white/[0.06] flex gap-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-purple-500 text-white'
                : tab.id === 'danger'
                ? 'border-transparent text-red-400/70 hover:text-red-400'
                : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-white/20'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-8 max-w-2xl">
        {activeTab === 'profile' && <ProfileTab />}
        {activeTab === 'company' && <CompanyTab />}
        {activeTab === 'security' && <SecurityTab />}
        {activeTab === 'notifications' && <NotificationsTab />}
        {activeTab === 'billing' && <BillingTab />}
        {activeTab === 'danger' && <DangerTab />}
      </div>
    </div>
  )
}

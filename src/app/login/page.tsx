'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Check } from 'lucide-react'
import Logo from '@/components/Logo'

const FEATURES = [
  'Live GA4, PageSpeed, SEMrush & ClickUp',
  'AI-written client-ready summaries',
  'Branded PDF + Doc export one click',
]

function BrandPanel() {
  return (
    <div className="hidden lg:flex w-[420px] flex-shrink-0 flex-col bg-[#0e1117] border-r border-white/[0.06] p-10">
      <div className="mb-12 flex items-center gap-2">
        <Logo className="w-6 h-6 text-purple-400 flex-shrink-0" />
        <span className="font-bold text-lg tracking-tight">
          <span className="text-purple-400">Report</span><span className="text-white">Hub</span>
        </span>
      </div>

      <div className="flex-1">
        <h1 className="text-4xl font-bold text-white leading-[1.15] mb-8">
          Client reports —<br />
          <span className="text-purple-400">on autopilot.</span>
        </h1>

        <ul className="space-y-3.5">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-3 h-3 text-purple-400" />
              </span>
              <span className="text-sm text-slate-400">{f}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-slate-600">© 2025 ReportHub · made by MagCompany</p>
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await new Promise(r => setTimeout(r, 600))
    router.push('/')
  }

  return (
    <div className="flex h-screen bg-[#131821]">
      <BrandPanel />

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex items-center justify-center gap-2">
            <Logo className="w-6 h-6 text-purple-400 flex-shrink-0" />
            <span className="font-bold text-xl tracking-tight">
              <span className="text-purple-400">Report</span><span className="text-white">Hub</span>
            </span>
          </div>

          <div className="mb-7">
            <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
            <p className="text-sm text-slate-400">Sign in to your ReportHub workspace</p>
          </div>

          {/* Social buttons */}
          <div className="space-y-2.5 mb-6">
            <button className="w-full flex items-center justify-center gap-3 bg-white/[0.04] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white hover:bg-white/[0.08] transition-colors">
              <GoogleIcon />
              Continue with Google
            </button>
            <button className="w-full flex items-center justify-center gap-3 bg-white/[0.04] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white hover:bg-white/[0.08] transition-colors">
              <MicrosoftIcon />
              Continue with Microsoft
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-xs text-slate-600">or with email</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
                <button type="button" className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 transition-colors pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-white/[0.04] accent-purple-500 cursor-pointer"
              />
              <span className="text-sm text-slate-400">Keep me signed in for 30 days</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-medium text-sm rounded-lg py-2.5 transition-colors"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            New to ReportHub?{' '}
            <Link href="/register" className="text-purple-400 hover:text-purple-300 transition-colors">
              Create an account →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function MicrosoftIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path fill="#f25022" d="M1 1h10v10H1z" />
      <path fill="#00a4ef" d="M13 1h10v10H13z" />
      <path fill="#7fba00" d="M1 13h10v10H1z" />
      <path fill="#ffb900" d="M13 13h10v10H13z" />
    </svg>
  )
}

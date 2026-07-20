'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User, Settings, LogOut, ChevronDown } from 'lucide-react'

interface Props {
  onSettings: () => void
  onProfile: () => void
}

const USER = {
  name: 'Liam Whitfield',
  email: 'liam@magnopas.studio',
  initials: 'LW',
}

export default function ProfileDropdown({ onSettings, onProfile }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const handleItem = (fn: () => void) => {
    setOpen(false)
    fn()
  }

  return (
    <div ref={ref} className="relative">
      {/* Avatar button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors group"
      >
        <span className="w-7 h-7 rounded-full bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-[11px] font-bold text-purple-300 flex-shrink-0">
          {USER.initials}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-56 bg-[#1c2232] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden z-50">
          {/* User info */}
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-xs font-bold text-purple-300 flex-shrink-0">
                {USER.initials}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{USER.name}</p>
                <p className="text-xs text-slate-500 truncate">{USER.email}</p>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1.5">
            <MenuItem
              icon={<User className="w-3.5 h-3.5" />}
              label="Profile"
              onClick={() => handleItem(onProfile)}
            />
            <MenuItem
              icon={<Settings className="w-3.5 h-3.5" />}
              label="Settings"
              onClick={() => handleItem(onSettings)}
            />
          </div>

          <div className="border-t border-white/[0.06] py-1.5">
            <MenuItem
              icon={<LogOut className="w-3.5 h-3.5" />}
              label="Log out"
              danger
              onClick={() => handleItem(() => router.push('/login'))}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function MenuItem({ icon, label, onClick, danger }: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
        danger
          ? 'text-red-400 hover:bg-red-500/10'
          : 'text-slate-300 hover:text-white hover:bg-white/5'
      }`}
    >
      <span className={danger ? 'text-red-400' : 'text-slate-500'}>{icon}</span>
      {label}
    </button>
  )
}

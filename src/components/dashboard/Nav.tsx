'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, ClipboardList, Settings2, LogOut,
  Kanban, BarChart2, Receipt, FileText, MoreHorizontal, X,
} from 'lucide-react'

interface NavProps {
  orgName?: string
  userName?: string
}

/** Returns up to 2 uppercase initials from a full name, e.g. "Jane Smith" → "JS" */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function Avatar({ name }: { name: string }) {
  const initials = getInitials(name)
  return (
    <span
      title={name}
      aria-label={name}
      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[#1A3329] text-[10px] font-semibold uppercase tracking-wider text-white"
    >
      {initials}
    </span>
  )
}

const navLinks = [
  { href: '/dashboard',           label: 'Dashboard' },
  { href: '/dashboard/pipeline',  label: 'Pipeline' },
  { href: '/dashboard/clients',   label: 'Clients' },
  { href: '/dashboard/jobs',      label: 'Jobs' },
  { href: '/dashboard/quotes',    label: 'Quotes' },
  { href: '/dashboard/invoices',  label: 'Invoices' },
  { href: '/dashboard/reports',   label: 'Reports' },
]

/** Primary tabs always visible in the mobile bottom bar */
const primaryTabs = [
  { href: '/dashboard',           label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/dashboard/clients',   label: 'Clients',   Icon: Users },
  { href: '/dashboard/jobs',      label: 'Jobs',      Icon: ClipboardList },
  { href: '/dashboard/quotes',    label: 'Quotes',    Icon: FileText },
  { href: '/dashboard/invoices',  label: 'Invoices',  Icon: Receipt },
]

/** Items shown inside the "More" slide-up panel */
const moreItems = [
  { href: '/dashboard/pipeline',  label: 'Pipeline',  Icon: Kanban },
  { href: '/dashboard/reports',   label: 'Reports',   Icon: BarChart2 },
  { href: '/dashboard/settings',  label: 'Settings',  Icon: Settings2 },
]

export default function Nav({ orgName, userName }: NavProps) {
  const path = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const isTabActive = (href: string) =>
    href === '/dashboard' ? path === '/dashboard' : path.startsWith(href)

  const isMoreActive = moreItems.some(item => path.startsWith(item.href))

  // Close panel on outside tap
  useEffect(() => {
    if (!moreOpen) return
    const handler = (e: MouseEvent | TouchEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [moreOpen])

  // Close panel on route change
  useEffect(() => { setMoreOpen(false) }, [path])

  return (
    <>
      {/* ── Mobile header (phone only) ─────────────────────────────── */}
      <div className="md:hidden fixed top-0 inset-x-0 z-50 h-12 flex items-center bg-[rgba(249,250,251,0.9)] backdrop-blur-md border-b border-zinc-200">
        {/* User avatar — left */}
        <div className="w-12 flex items-center justify-center">
          {userName ? <Avatar name={userName} /> : <div className="w-7" />}
        </div>
        <a href="/dashboard" className="flex-1 flex flex-col items-center leading-tight">
          <span className="text-xs font-medium tracking-[0.22em] uppercase text-zinc-900">
            {orgName ?? 'Lustre'}
          </span>
          <span className="text-[9px] tracking-widest uppercase text-zinc-400">
            Powered by Lustre
          </span>
        </a>
        <form action="/auth/signout" method="post" className="w-12 flex items-center justify-center">
          <button
            className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* ── Desktop / tablet top nav (md+) ────────────────────────── */}
      <nav className="hidden md:block fixed top-0 inset-x-0 z-50 bg-[rgba(249,250,251,0.9)] backdrop-blur-md border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <a href="/dashboard" className="flex flex-col leading-tight">
              <span className="text-xs font-medium tracking-[0.22em] uppercase text-zinc-900">
                {orgName ?? 'Lustre'}
              </span>
              <span className="text-[9px] tracking-widest uppercase text-zinc-400">
                Powered by Lustre
              </span>
            </a>
            <span className="text-zinc-200">|</span>
            {navLinks.map(link => {
              const active = link.href === '/dashboard'
                ? path === '/dashboard'
                : path.startsWith(link.href)
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={`text-xs tracking-wide transition-colors ${
                    active ? 'text-zinc-900 font-medium' : 'text-zinc-400 hover:text-zinc-900'
                  }`}
                >
                  {link.label}
                </a>
              )
            })}
          </div>

          <div className="flex items-center gap-4">
            {userName && (
              <span className="flex items-center gap-2">
                <Avatar name={userName} />
                <span className="text-xs text-zinc-500 max-w-[140px] truncate" title={userName}>
                  {userName}
                </span>
              </span>
            )}
            <a
              href="/dashboard/settings"
              className={`text-xs tracking-wide transition-colors ${
                path === '/dashboard/settings'
                  ? 'text-zinc-900 font-medium'
                  : 'text-zinc-400 hover:text-zinc-900'
              }`}
            >
              Settings
            </a>
            <form action="/auth/signout" method="post">
              <button className="text-xs tracking-wide text-zinc-400 hover:text-zinc-900 transition-colors">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </nav>

      {/* ── "More" slide-up panel (phone only) ─────────────────────── */}
      {/* Backdrop */}
      <div
        className={`md:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity duration-200 ${
          moreOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`md:hidden fixed inset-x-0 z-50 bg-[rgba(249,250,251,0.97)] backdrop-blur-md rounded-t-2xl shadow-lg transition-transform duration-300 ease-out ${
          moreOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{
          bottom: `calc(4rem + env(safe-area-inset-bottom, 0px))`,
        }}
        role="dialog"
        aria-modal="true"
        aria-label="More navigation"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-8 h-1 rounded-full bg-zinc-300" />
        </div>

        {/* Header row */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100">
          <span className="text-xs font-semibold tracking-widest uppercase text-zinc-400">More</span>
          <button
            onClick={() => setMoreOpen(false)}
            className="p-1 text-zinc-400 hover:text-zinc-900 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Links */}
        <div className="px-4 py-3 flex flex-col gap-1">
          {moreItems.map(({ href, label, Icon }) => {
            const active = path.startsWith(href)
            return (
              <a
                key={href}
                href={href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  active
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200'
                }`}
              >
                <Icon strokeWidth={active ? 2 : 1.5} className="w-5 h-5 flex-shrink-0" />
                <span className={`text-sm tracking-wide ${active ? 'font-medium' : ''}`}>
                  {label}
                </span>
              </a>
            )
          })}

          {/* Sign out row */}
          <form action="/auth/signout" method="post" className="mt-1">
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:bg-zinc-100 active:bg-zinc-200 transition-colors"
            >
              <LogOut strokeWidth={1.5} className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm tracking-wide">Sign out</span>
            </button>
          </form>
        </div>

        {/* Bottom breathing room */}
        <div className="h-3" />
      </div>

      {/* ── Mobile bottom tab bar (phone only) ────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-[rgba(249,250,251,0.9)] backdrop-blur-md border-t border-zinc-200"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex h-16">
          {primaryTabs.map(({ href, label, Icon }) => {
            const active = isTabActive(href)
            return (
              <a
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center flex-1 gap-1 transition-colors ${
                  active ? 'text-zinc-900' : 'text-zinc-400'
                }`}
              >
                <Icon strokeWidth={active ? 2 : 1.5} className="w-5 h-5" />
                <span className={`text-[10px] tracking-wide ${active ? 'font-medium' : ''}`}>
                  {label}
                </span>
              </a>
            )
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(prev => !prev)}
            className={`flex flex-col items-center justify-center flex-1 gap-1 transition-colors ${
              moreOpen || isMoreActive ? 'text-zinc-900' : 'text-zinc-400'
            }`}
            aria-label="More navigation options"
            aria-expanded={moreOpen}
          >
            <MoreHorizontal
              strokeWidth={moreOpen || isMoreActive ? 2 : 1.5}
              className="w-5 h-5"
            />
            <span className={`text-[10px] tracking-wide ${moreOpen || isMoreActive ? 'font-medium' : ''}`}>
              More
            </span>
          </button>
        </div>
      </nav>
    </>
  )
}

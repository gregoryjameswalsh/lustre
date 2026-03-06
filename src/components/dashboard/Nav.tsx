'use client'

import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, ClipboardList, FileText, Settings2, LogOut } from 'lucide-react'

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
      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#4a5c4e] text-[10px] font-semibold uppercase tracking-wider text-white"
    >
      {initials}
    </span>
  )
}

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/clients', label: 'Clients' },
  { href: '/dashboard/jobs', label: 'Jobs' },
  { href: '/dashboard/quotes', label: 'Quotes' },
]

const tabs = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/dashboard/clients', label: 'Clients', Icon: Users },
  { href: '/dashboard/jobs', label: 'Jobs', Icon: ClipboardList },
  { href: '/dashboard/quotes', label: 'Quotes', Icon: FileText },
  { href: '/dashboard/settings', label: 'Settings', Icon: Settings2 },
]

export default function Nav({ orgName, userName }: NavProps) {
  const path = usePathname()

  const isTabActive = (href: string) =>
    href === '/dashboard' ? path === '/dashboard' : path.startsWith(href)

  return (
    <>
      {/* ── Mobile header (phone only) ─────────────────────────────── */}
      <div className="md:hidden fixed top-0 inset-x-0 z-50 h-12 flex items-center bg-[rgba(249,248,245,0.9)] backdrop-blur-md border-b border-zinc-200">
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
      <nav className="hidden md:block fixed top-0 inset-x-0 z-50 bg-[rgba(249,248,245,0.9)] backdrop-blur-md border-b border-zinc-200">
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
            {navLinks.map(link => (
              <a
                key={link.href}
                href={link.href}
                className={`text-xs tracking-wide transition-colors ${
                  path === link.href
                    ? 'text-zinc-900 font-medium'
                    : 'text-zinc-400 hover:text-zinc-900'
                }`}
              >
                {link.label}
              </a>
            ))}
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

      {/* ── Mobile bottom tab bar (phone only) ────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-[rgba(249,248,245,0.9)] backdrop-blur-md border-t border-zinc-200"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex h-16">
          {tabs.map(({ href, label, Icon }) => {
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
        </div>
      </nav>
    </>
  )
}

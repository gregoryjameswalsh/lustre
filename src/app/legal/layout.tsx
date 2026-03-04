// src/app/legal/layout.tsx
// Shared layout for all /legal/* pages.
// Sidebar nav on desktop; horizontal scroll strip on mobile.

import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s — Lustre Legal',
    default: 'Legal — Lustre',
  },
}

const nav = [
  { href: '/legal/terms',        label: 'Terms of Service' },
  { href: '/legal/privacy',      label: 'Privacy Policy' },
  { href: '/legal/dpa',          label: 'Data Processing' },
  { href: '/legal/subprocessors',label: 'Subprocessors' },
  { href: '/legal/security',     label: 'Security' },
  { href: '/legal/cookies',      label: 'Cookie Policy' },
]

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f9f8f5]">

      {/* Top bar */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="text-xs font-medium tracking-[0.25em] uppercase text-zinc-800 hover:text-[#4a5c4e] transition-colors"
          >
            Lustre
          </Link>
          <span className="text-xs tracking-widest uppercase text-zinc-400">
            Legal
          </span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10 md:flex md:gap-16">

        {/* Sidebar — desktop */}
        <aside className="hidden md:block w-52 shrink-0">
          <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-zinc-400 mb-4">
            Documents
          </p>
          <nav className="flex flex-col gap-1">
            {nav.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors py-1.5 border-l-2 border-transparent pl-3 hover:border-zinc-300 data-[active=true]:border-[#4a5c4e] data-[active=true]:text-zinc-900 data-[active=true]:font-medium"
              >
                {label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Horizontal nav — mobile */}
        <div className="md:hidden mb-8 -mx-6 px-6 overflow-x-auto">
          <nav className="flex gap-2 min-w-max">
            {nav.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors whitespace-nowrap border border-zinc-200 rounded-full px-3 py-1.5 bg-white hover:border-zinc-400"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>

      <footer className="border-t border-zinc-200 mt-16">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <p className="text-xs text-zinc-300 tracking-wider">
            &copy; {new Date().getFullYear()} Altrera Industries
          </p>
          <Link
            href="/"
            className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors tracking-wide"
          >
            Back to app
          </Link>
        </div>
      </footer>
    </div>
  )
}

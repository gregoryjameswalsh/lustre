'use client'

import { usePathname } from 'next/navigation'

interface NavProps {
  orgName: string
}

export default function Nav({ orgName }: NavProps) {
  const path = usePathname()

  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/dashboard/clients', label: 'Clients' },
    { href: '/dashboard/jobs', label: 'Jobs' },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[rgba(249,248,245,0.9)] backdrop-blur-md border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <a href="/dashboard" className="flex flex-col leading-tight">
            <span className="text-xs font-medium tracking-[0.22em] uppercase text-zinc-900">
              {orgName}
            </span>
            <span className="text-[9px] tracking-widest uppercase text-zinc-400">
              Powered by Lustre
            </span>
          </a>
          <span className="text-zinc-200">|</span>
          {links.map(link => (
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
        <form action="/auth/signout" method="post">
          <button className="text-xs tracking-wide text-zinc-400 hover:text-zinc-900 transition-colors">
            Sign out
          </button>
        </form>
      </div>
    </nav>
  )
}
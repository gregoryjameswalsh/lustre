'use client'

// src/app/dashboard/settings/_components/SettingsSidebarNav.tsx
// =============================================================================
// LUSTRE — Settings sidebar navigation (desktop only, md+)
// Active state is derived from the current pathname.
// =============================================================================

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  label: string
  href: string
  exact?: boolean
}

interface NavSection {
  items: NavItem[]
}

function buildSections(isAdmin: boolean): NavSection[] {
  return [
    {
      items: [
        { label: 'Account', href: '/dashboard/settings', exact: true },
        { label: 'Team', href: '/dashboard/settings/team' },
        ...(isAdmin ? [{ label: 'Billing', href: '/dashboard/settings/billing' }] : []),
      ],
    },
    ...(isAdmin
      ? [
          {
            items: [
              { label: 'Job Types',  href: '/dashboard/settings/job-types' },
              { label: 'Checklists', href: '/dashboard/settings/checklists' },
              { label: 'Tags',       href: '/dashboard/settings/tags' },
              { label: 'Roles',      href: '/dashboard/settings/roles' },
            ],
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            items: [
              { label: 'Data & Privacy', href: '/dashboard/settings/gdpr' },
            ],
          },
        ]
      : []),
  ]
}

export default function SettingsSidebarNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()
  const sections = buildSections(isAdmin)

  return (
    <nav aria-label="Settings navigation">
      {sections.map((section, i) => (
        <div key={i} className={i > 0 ? 'mt-4 pt-4 border-t border-zinc-100' : ''}>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href)
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className={`flex items-center rounded-lg px-3 py-2 text-sm transition-colors ${
                      active
                        ? 'bg-[#1A3329]/10 text-[#1A3329] font-medium'
                        : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

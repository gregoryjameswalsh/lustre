'use client'

// src/app/portal/[slug]/dashboard/_components/PortalNav.tsx
// =============================================================================
// LUSTRE — Portal Navigation Bar
// Operator-branded top navigation for portal clients.
// =============================================================================

import Link             from 'next/link'
import { usePathname }  from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter }    from 'next/navigation'

interface Props {
  slug:             string
  orgName:          string
  orgLogoUrl:       string | null
  orgBrandColor:    string | null
  clientFirstName:  string
}

export default function PortalNav({ slug, orgName, orgLogoUrl, orgBrandColor, clientFirstName }: Props) {
  const pathname = usePathname()
  const router   = useRouter()
  const brand    = orgBrandColor ?? '#1A3329'

  const base  = `/portal/${slug}/dashboard`
  const links = [
    { href: base,                    label: 'Upcoming' },
    { href: `${base}/history`,       label: 'History'  },
    { href: `${base}/properties`,    label: 'Properties' },
    { href: `${base}/requests`,      label: 'Requests' },
  ]

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push(`/portal/${slug}`)
  }

  return (
    <header style={{ borderBottomColor: '#e5e7eb' }} className="border-b bg-white sticky top-0 z-30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">

          {/* Brand */}
          <Link href={base} className="flex items-center gap-2 flex-shrink-0">
            {orgLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={orgLogoUrl} alt={orgName} className="h-7 max-w-[120px] object-contain" />
            ) : (
              <span
                className="text-xs font-semibold uppercase tracking-[0.18em]"
                style={{ color: brand }}
              >
                {orgName}
              </span>
            )}
          </Link>

          {/* Nav links — desktop */}
          <nav className="hidden sm:flex items-center gap-1">
            {links.map(link => {
              const active = pathname === link.href || (link.href !== base && pathname.startsWith(link.href))
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium tracking-wide transition-colors ${
                    active
                      ? 'bg-zinc-100 text-zinc-900'
                      : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {/* User + sign out */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-xs text-zinc-400">
              Hi, {clientFirstName}
            </span>
            <button
              onClick={handleSignOut}
              className="text-xs text-zinc-300 hover:text-zinc-500 transition-colors uppercase tracking-widest"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="sm:hidden flex gap-1 pb-2">
          {links.map(link => {
            const active = pathname === link.href || (link.href !== base && pathname.startsWith(link.href))
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-md text-xs font-medium tracking-wide transition-colors ${
                  active
                    ? 'bg-zinc-100 text-zinc-900'
                    : 'text-zinc-400 hover:text-zinc-700'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </div>
      </div>
    </header>
  )
}

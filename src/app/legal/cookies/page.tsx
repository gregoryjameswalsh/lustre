// src/app/legal/cookies/page.tsx

import type { Metadata } from 'next'
import { LegalPage, Section, P } from '../_components'

export const metadata: Metadata = { title: 'Cookie Policy' }

type Cookie = {
  name: string
  provider: string
  purpose: string
  duration: string
  type: 'Essential' | 'Analytics' | 'Functional'
}

const cookies: Cookie[] = [
  {
    name: 'sb-*',
    provider: 'Supabase',
    purpose: 'Stores authentication session tokens',
    duration: 'Session / 1 week',
    type: 'Essential',
  },
  {
    name: 'ph_*',
    provider: 'PostHog',
    purpose: 'Product analytics — page views, feature usage',
    duration: '1 year',
    type: 'Analytics',
  },
  {
    name: '__ph_opt_in_out_*',
    provider: 'PostHog',
    purpose: 'Stores your analytics opt-out preference',
    duration: '1 year',
    type: 'Functional',
  },
]

const typeColor: Record<Cookie['type'], string> = {
  Essential: 'bg-zinc-100 text-zinc-600',
  Analytics: 'bg-blue-50 text-blue-700',
  Functional: 'bg-amber-50 text-amber-700',
}

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      effectiveDate="1 March 2026"
    >
      <Section heading="What Are Cookies?">
        <P>
          Cookies are small text files stored on your device when you visit a website.
          They allow the site to remember your preferences and actions over time.
        </P>
      </Section>

      <Section heading="How We Use Cookies">
        <P>
          Lustre uses a minimal set of cookies, described in the table below. We
          categorise them as:
        </P>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {(['Essential', 'Analytics', 'Functional'] as const).map((t) => (
            <span key={t} className={`px-2.5 py-1 rounded-full font-medium ${typeColor[t]}`}>
              {t}
            </span>
          ))}
        </div>
      </Section>

      <Section heading="Cookies We Set">
        <div className="mt-4 border border-zinc-200 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="hidden md:grid grid-cols-[2fr_1.5fr_3fr_1.5fr_1fr] bg-zinc-50 border-b border-zinc-200">
            {['Cookie', 'Provider', 'Purpose', 'Duration', 'Type'].map((h) => (
              <div key={h} className="px-4 py-3 text-[10px] font-medium tracking-[0.15em] uppercase text-zinc-400">
                {h}
              </div>
            ))}
          </div>

          {cookies.map((c, i) => (
            <div
              key={c.name}
              className={`md:grid md:grid-cols-[2fr_1.5fr_3fr_1.5fr_1fr] px-4 py-4 flex flex-col gap-1 ${
                i !== cookies.length - 1 ? 'border-b border-zinc-100' : ''
              }`}
            >
              <div className="font-mono text-xs text-zinc-800 break-all">{c.name}</div>
              <div className="text-sm text-zinc-500">{c.provider}</div>
              <div className="text-sm text-zinc-500">{c.purpose}</div>
              <div className="text-sm text-zinc-400">{c.duration}</div>
              <div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColor[c.type]}`}>
                  {c.type}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section heading="Essential Cookies">
        <P>
          Essential cookies are required for the Service to function. They cannot be
          disabled without breaking core features such as authentication.
        </P>
      </Section>

      <Section heading="Analytics Cookies">
        <P>
          We use PostHog to understand how the Service is used so we can improve it.
          Analytics cookies are set only with your consent and can be disabled at any
          time via your account settings.
        </P>
      </Section>

      <Section heading="Managing Cookies">
        <P>
          You can control cookies through your browser settings. Note that disabling
          essential cookies will prevent you from logging in. You can opt out of
          analytics specifically by contacting us at{' '}
          <a href="mailto:privacy@altrera.com" className="text-[#4a5c4e] underline underline-offset-2">
            privacy@altrera.com
          </a>
          .
        </P>
      </Section>

      <Section heading="Changes">
        <P>
          We may update this policy as we add or remove cookies. Material changes will
          be communicated via in-app notice.
        </P>
      </Section>
    </LegalPage>
  )
}

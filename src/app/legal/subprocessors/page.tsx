// src/app/legal/subprocessors/page.tsx

import type { Metadata } from 'next'
import { LegalPage, Section, P } from '../_components'

export const metadata: Metadata = { title: 'Subprocessors' }

type DpaType = 'standard' | 'signed'

type Subprocessor = {
  name: string
  purpose: string
  location: string
  dpaLink: string
  dpaType: DpaType
}

const subprocessors: Subprocessor[] = [
  {
    name: 'Supabase',
    purpose: 'Database, authentication, and file storage',
    location: 'USA (AWS us-east-1)',
    dpaLink: 'https://supabase.com/legal/dpa',
    dpaType: 'standard',
  },
  {
    name: 'Stripe',
    purpose: 'Payment processing and subscription management',
    location: 'USA',
    dpaLink: 'https://stripe.com/legal/dpa',
    dpaType: 'standard',
  },
  {
    name: 'Resend',
    purpose: 'Transactional email delivery',
    location: 'USA',
    dpaLink: 'https://resend.com/legal/dpa',
    dpaType: 'standard',
  },
  {
    name: 'PostHog',
    purpose: 'Product analytics and session recording',
    location: 'USA / EU (customer choice)',
    dpaLink: 'https://posthog.com/dpa',
    dpaType: 'standard',
  },
  {
    name: 'Upstash',
    purpose: 'Rate limiting via Redis',
    location: 'USA',
    dpaLink: 'https://upstash.com/trust/dpa.pdf',
    dpaType: 'standard',
  },
  {
    name: 'Sentry',
    purpose: 'Error tracking and performance monitoring',
    location: 'USA',
    dpaLink: 'https://sentry.io/legal/dpa/',
    dpaType: 'standard',
  },
  {
    name: 'Vercel',
    purpose: 'Application hosting and edge network',
    location: 'USA / Global CDN',
    dpaLink: 'https://vercel.com/legal/dpa',
    dpaType: 'standard',
  },
  {
    name: 'Checkly',
    purpose: 'Synthetic monitoring and uptime checks',
    location: 'USA',
    dpaLink: 'https://www.checklyhq.com/legal/dpa/',
    dpaType: 'standard',
  },
]

export default function SubprocessorsPage() {
  return (
    <LegalPage
      title="Subprocessors"
      effectiveDate="1 March 2026"
    >
      <Section heading="Overview">
        <P>
          Altrera Industries uses the following third-party subprocessors to deliver
          the Lustre service. All subprocessors are bound by data processing
          agreements consistent with our{' '}
          <a href="/legal/dpa" className="text-[#4a5c4e] underline underline-offset-2">
            Data Processing Agreement
          </a>
          .
        </P>
        <P>
          We will provide 30 days&apos; notice of any changes to this list. If you have
          objections, contact{' '}
          <a href="mailto:legal@altrera.com" className="text-[#4a5c4e] underline underline-offset-2">
            legal@altrera.com
          </a>
          .
        </P>
      </Section>

      <Section heading="Current Subprocessors">
        <P>
          &ldquo;Standard&rdquo; DPAs are incorporated into the vendor&rsquo;s terms of service and accepted
          upon account creation. &ldquo;Signed&rdquo; DPAs are separately executed agreements. Both are
          binding under UK GDPR Article 28.
        </P>
        <div className="mt-4 border border-zinc-200 rounded-lg overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[2fr_3fr_2fr_1fr_1fr] bg-zinc-50 border-b border-zinc-200">
            <div className="px-4 py-3 text-[10px] font-medium tracking-[0.15em] uppercase text-zinc-400">
              Provider
            </div>
            <div className="px-4 py-3 text-[10px] font-medium tracking-[0.15em] uppercase text-zinc-400">
              Purpose
            </div>
            <div className="px-4 py-3 text-[10px] font-medium tracking-[0.15em] uppercase text-zinc-400">
              Location
            </div>
            <div className="px-4 py-3 text-[10px] font-medium tracking-[0.15em] uppercase text-zinc-400">
              DPA
            </div>
            <div className="px-4 py-3 text-[10px] font-medium tracking-[0.15em] uppercase text-zinc-400">
              Type
            </div>
          </div>

          {/* Rows */}
          {subprocessors.map((sp, i) => (
            <div
              key={sp.name}
              className={`md:grid md:grid-cols-[2fr_3fr_2fr_1fr_1fr] px-4 py-4 gap-0 flex flex-col gap-1 ${
                i !== subprocessors.length - 1 ? 'border-b border-zinc-100' : ''
              }`}
            >
              <div className="flex items-center">
                <span className="text-sm font-medium text-zinc-800">{sp.name}</span>
              </div>
              <div className="text-sm text-zinc-500">{sp.purpose}</div>
              <div className="text-sm text-zinc-400">{sp.location}</div>
              <div className="flex items-center">
                <a
                  href={sp.dpaLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#4a5c4e] underline underline-offset-2 hover:opacity-70 transition-opacity"
                >
                  View DPA
                </a>
              </div>
              <div className="flex items-center">
                <span className="text-xs text-zinc-400 capitalize">{sp.dpaType}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </LegalPage>
  )
}

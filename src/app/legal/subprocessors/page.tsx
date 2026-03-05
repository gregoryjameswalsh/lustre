// src/app/legal/subprocessors/page.tsx

import type { Metadata } from 'next'
import { LegalPage, Section, P } from '../_components'

export const metadata: Metadata = { title: 'Subprocessors' }

type Subprocessor = {
  name: string
  purpose: string
  location: string
  link: string
}

const subprocessors: Subprocessor[] = [
  {
    name: 'Supabase',
    purpose: 'Database, authentication, and file storage',
    location: 'USA (AWS us-east-1)',
    link: 'https://supabase.com/privacy',
  },
  {
    name: 'Stripe',
    purpose: 'Payment processing and subscription management',
    location: 'USA',
    link: 'https://stripe.com/privacy',
  },
  {
    name: 'Resend',
    purpose: 'Transactional email delivery',
    location: 'USA',
    link: 'https://resend.com/legal/privacy-policy',
  },
  {
    name: 'PostHog',
    purpose: 'Product analytics and session recording',
    location: 'USA / EU (customer choice)',
    link: 'https://posthog.com/privacy',
  },
  {
    name: 'Upstash',
    purpose: 'Rate limiting via Redis',
    location: 'USA',
    link: 'https://upstash.com/privacy',
  },
  {
    name: 'Sentry',
    purpose: 'Error tracking and performance monitoring',
    location: 'USA',
    link: 'https://sentry.io/privacy/',
  },
  {
    name: 'Vercel',
    purpose: 'Application hosting and edge network',
    location: 'USA / Global CDN',
    link: 'https://vercel.com/legal/privacy-policy',
  },
  {
    name: 'Checkly',
    purpose: 'Synthetic monitoring and uptime checks',
    location: 'USA',
    link: 'https://www.checklyhq.com/legal/privacy/',
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
          We will provide 30 days' notice of any changes to this list. If you have
          objections, contact{' '}
          <a href="mailto:legal@altrera.com" className="text-[#4a5c4e] underline underline-offset-2">
            legal@altrera.com
          </a>
          .
        </P>
      </Section>

      <Section heading="Current Subprocessors">
        <div className="mt-4 border border-zinc-200 rounded-lg overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[2fr_3fr_2fr] bg-zinc-50 border-b border-zinc-200">
            <div className="px-4 py-3 text-[10px] font-medium tracking-[0.15em] uppercase text-zinc-400">
              Provider
            </div>
            <div className="px-4 py-3 text-[10px] font-medium tracking-[0.15em] uppercase text-zinc-400">
              Purpose
            </div>
            <div className="px-4 py-3 text-[10px] font-medium tracking-[0.15em] uppercase text-zinc-400">
              Location
            </div>
          </div>

          {/* Rows */}
          {subprocessors.map((sp, i) => (
            <div
              key={sp.name}
              className={`md:grid md:grid-cols-[2fr_3fr_2fr] px-4 py-4 gap-0 flex flex-col gap-1 ${
                i !== subprocessors.length - 1 ? 'border-b border-zinc-100' : ''
              }`}
            >
              <div className="flex items-center">
                <a
                  href={sp.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-zinc-800 hover:text-[#4a5c4e] transition-colors"
                >
                  {sp.name}
                </a>
              </div>
              <div className="text-sm text-zinc-500">{sp.purpose}</div>
              <div className="text-sm text-zinc-400">{sp.location}</div>
            </div>
          ))}
        </div>
      </Section>
    </LegalPage>
  )
}

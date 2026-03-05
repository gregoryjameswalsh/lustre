// src/app/legal/security/page.tsx

import type { Metadata } from 'next'
import { LegalPage, Section, P, Ul } from '../_components'

export const metadata: Metadata = { title: 'Security' }

export default function SecurityPage() {
  return (
    <LegalPage
      title="Security"
      effectiveDate="1 March 2026"
    >
      <Section heading="Our Commitment">
        <P>
          Security is central to how we build and operate Lustre. This page describes
          the technical and organisational measures Altrera Industries maintains to
          protect your data.
        </P>
      </Section>

      <Section heading="Infrastructure">
        <Ul items={[
          'Hosted on Vercel\'s edge network with global redundancy',
          'Database and auth managed by Supabase (PostgreSQL on AWS)',
          'All data encrypted at rest (AES-256) and in transit (TLS 1.2+)',
          'Production environment is logically isolated from development',
        ]} />
      </Section>

      <Section heading="Application Security">
        <Ul items={[
          'Authentication via Supabase Auth with bcrypt password hashing',
          'HTTP security headers enforced on all responses (HSTS, CSP, X-Frame-Options)',
          'Rate limiting applied to all authentication and API endpoints via Upstash Redis',
          'Input validation and parameterised queries throughout to prevent injection attacks',
          'Dependencies audited regularly; automated security scanning via GitHub Actions',
          'Error tracking via Sentry — stack traces never include sensitive data',
        ]} />
      </Section>

      <Section heading="Access Control">
        <Ul items={[
          'Row-level security enforced in Supabase so each organisation can only access its own data',
          'Internal system access is role-based with least-privilege principles',
          'Production database credentials are rotated regularly and stored in secrets management',
          'All administrative access requires multi-factor authentication',
        ]} />
      </Section>

      <Section heading="Monitoring & Incident Response">
        <Ul items={[
          'Continuous uptime monitoring via Checkly with automated alerts',
          'Application performance and error monitoring via Sentry',
          'Logs retained for 30 days for forensic investigation',
          'Incident response plan in place; affected customers notified within 72 hours of a confirmed breach',
        ]} />
      </Section>

      <Section heading="Payments">
        <P>
          All payment processing is handled by Stripe. Lustre never stores, transmits,
          or has access to raw card numbers. Stripe is PCI DSS Level 1 certified.
        </P>
      </Section>

      <Section heading="Third-Party Vendors">
        <P>
          All subprocessors are vetted for security practices. See our{' '}
          <a href="/legal/subprocessors" className="text-[#4a5c4e] underline underline-offset-2">
            Subprocessors page
          </a>{' '}
          for the complete list.
        </P>
      </Section>

      <Section heading="Responsible Disclosure">
        <P>
          If you discover a security vulnerability, please report it to{' '}
          <a href="mailto:security@altrera.com" className="text-[#4a5c4e] underline underline-offset-2">
            security@altrera.com
          </a>
          . We will acknowledge receipt within 48 hours and work with you to resolve
          confirmed issues as quickly as possible. Please do not disclose publicly
          before we have had a reasonable opportunity to remediate.
        </P>
      </Section>
    </LegalPage>
  )
}

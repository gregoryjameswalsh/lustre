// src/app/legal/privacy/page.tsx

import type { Metadata } from 'next'
import { LegalPage, Section, P, Ul } from '../_components'

export const metadata: Metadata = { title: 'Privacy Policy' }

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      effectiveDate="1 March 2026"
    >
      <Section heading="1. Overview">
        <P>
          Altrera Industries ("we", "us") is committed to protecting your personal
          data. This policy explains what information we collect, how we use it, and
          your rights regarding that information when you use Lustre.
        </P>
      </Section>

      <Section heading="2. Information We Collect">
        <P>We collect information you provide directly:</P>
        <Ul items={[
          'Account details — name, email address, password hash',
          'Business information — company name, address',
          'Client and job data you enter into the Service',
          'Payment information (handled by Stripe — we do not store card details)',
        ]} />
        <P>We also collect information automatically:</P>
        <Ul items={[
          'Log data — IP address, browser type, pages visited, timestamps',
          'Device information — operating system, screen size',
          'Usage analytics via PostHog (see §6)',
        ]} />
      </Section>

      <Section heading="3. How We Use Your Information">
        <Ul items={[
          'Provide, operate, and improve the Service',
          'Process transactions and send related notices',
          'Respond to support requests',
          'Send product updates and marketing (you may opt out at any time)',
          'Detect and prevent fraud or abuse',
          'Comply with legal obligations',
        ]} />
      </Section>

      <Section heading="4. Legal Bases for Processing (GDPR)">
        <P>
          Where the GDPR applies, we process your personal data on the following
          bases: contract performance (to provide the Service), legitimate interests
          (security, analytics), consent (marketing), and legal obligation.
        </P>
      </Section>

      <Section heading="5. Data Sharing">
        <P>
          We do not sell your personal data. We share data only with service providers
          acting on our behalf (see our{' '}
          <a href="/legal/subprocessors" className="text-[#4a5c4e] underline underline-offset-2">
            Subprocessors list
          </a>
          ) and when required by law.
        </P>
      </Section>

      <Section heading="6. Analytics">
        <P>
          We use PostHog for product analytics. PostHog may set cookies and process
          usage data to help us understand how the Service is used. You can opt out
          via our Cookie Policy.
        </P>
      </Section>

      <Section heading="7. Data Retention">
        <P>
          We retain your data for as long as your account is active or as needed to
          provide the Service. After account deletion we purge personal data within
          90 days, except where retention is required by law.
        </P>
      </Section>

      <Section heading="8. Your Rights">
        <P>
          Depending on your location you may have the right to access, correct,
          delete, or restrict processing of your personal data, as well as the right
          to data portability and to withdraw consent. Submit requests to{' '}
          <a href="mailto:privacy@altrera.com" className="text-[#4a5c4e] underline underline-offset-2">
            privacy@altrera.com
          </a>
          .
        </P>
      </Section>

      <Section heading="9. Cookies">
        <P>
          We use cookies and similar technologies. See our{' '}
          <a href="/legal/cookies" className="text-[#4a5c4e] underline underline-offset-2">
            Cookie Policy
          </a>{' '}
          for details.
        </P>
      </Section>

      <Section heading="10. International Transfers">
        <P>
          Your data may be transferred to and processed in countries outside your
          own. Where required, we rely on Standard Contractual Clauses or other
          approved transfer mechanisms.
        </P>
      </Section>

      <Section heading="11. Changes">
        <P>
          We may update this policy periodically. We will notify you of material
          changes by email or in-app notice.
        </P>
      </Section>

      <Section heading="12. Contact">
        <P>
          For privacy enquiries contact us at{' '}
          <a href="mailto:privacy@altrera.com" className="text-[#4a5c4e] underline underline-offset-2">
            privacy@altrera.com
          </a>
          .
        </P>
      </Section>
    </LegalPage>
  )
}

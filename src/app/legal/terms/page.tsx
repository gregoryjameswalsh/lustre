// src/app/legal/terms/page.tsx

import type { Metadata } from 'next'
import { LegalPage, Section, P, Ul } from '../_components'

export const metadata: Metadata = { title: 'Terms of Service' }

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      effectiveDate="1 March 2026"
    >
      <Section heading="1. Acceptance of Terms">
        <P>
          By accessing or using Lustre ("Service"), operated by Altrera Industries
          ("Company", "we", "us"), you agree to be bound by these Terms of Service
          ("Terms"). If you do not agree, do not use the Service.
        </P>
      </Section>

      <Section heading="2. Description of Service">
        <P>
          Lustre is a cleaning business management platform that enables operators to
          manage clients, jobs, quotes, and related business operations. We reserve the
          right to modify or discontinue any part of the Service at any time.
        </P>
      </Section>

      <Section heading="3. Eligibility">
        <P>
          You must be at least 18 years old and capable of entering a binding contract
          to use the Service. By creating an account you represent that you meet these
          requirements.
        </P>
      </Section>

      <Section heading="4. Account Responsibilities">
        <P>
          You are responsible for maintaining the confidentiality of your credentials
          and for all activity under your account. Notify us immediately at
          legal@altrera.com if you suspect unauthorised access.
        </P>
      </Section>

      <Section heading="5. Acceptable Use">
        <P>You agree not to:</P>
        <Ul items={[
          'Use the Service for any unlawful purpose',
          'Attempt to gain unauthorised access to any system or data',
          'Transmit viruses or other harmful code',
          'Resell or sublicense the Service without prior written consent',
          'Scrape or harvest data from the Service',
        ]} />
      </Section>

      <Section heading="6. Subscription & Billing">
        <P>
          Paid plans are billed in advance on a monthly or annual basis via Stripe.
          All fees are non-refundable except as required by applicable law or as
          explicitly stated in our refund policy. We may change pricing with 30 days'
          notice.
        </P>
      </Section>

      <Section heading="7. Intellectual Property">
        <P>
          All content, trademarks, and software comprising the Service are owned by or
          licensed to Altrera Industries. Nothing in these Terms grants you a right to
          use our trademarks or branding.
        </P>
      </Section>

      <Section heading="8. Limitation of Liability">
        <P>
          To the maximum extent permitted by law, Altrera Industries shall not be
          liable for any indirect, incidental, special, or consequential damages
          arising from your use of the Service, even if advised of the possibility of
          such damages.
        </P>
      </Section>

      <Section heading="9. Termination">
        <P>
          We may suspend or terminate your account at our sole discretion, with or
          without notice, for conduct that we determine violates these Terms or is
          harmful to other users, us, or third parties.
        </P>
      </Section>

      <Section heading="10. Governing Law">
        <P>
          These Terms are governed by the laws of the jurisdiction in which Altrera
          Industries is registered, without regard to conflict of law principles.
        </P>
      </Section>

      <Section heading="11. Changes to Terms">
        <P>
          We may update these Terms from time to time. Continued use of the Service
          after changes constitute your acceptance of the revised Terms.
        </P>
      </Section>

      <Section heading="12. Contact">
        <P>
          Questions about these Terms should be directed to{' '}
          <a
            href="mailto:legal@altrera.com"
            className="text-[#4a5c4e] underline underline-offset-2"
          >
            legal@altrera.com
          </a>
          .
        </P>
      </Section>
    </LegalPage>
  )
}

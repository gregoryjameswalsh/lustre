// src/app/legal/dpa/page.tsx

import type { Metadata } from 'next'
import { LegalPage, Section, P, Ul } from '../_components'

export const metadata: Metadata = { title: 'Data Processing Agreement' }

export default function DpaPage() {
  return (
    <LegalPage
      title="Data Processing Agreement"
      effectiveDate="1 March 2026"
    >
      <Section heading="1. Scope">
        <P>
          This Data Processing Agreement ("DPA") forms part of the agreement between
          Altrera Industries ("Processor") and the customer ("Controller") for the
          use of Lustre. It governs the processing of personal data by Altrera
          Industries on behalf of the Controller.
        </P>
      </Section>

      <Section heading="2. Definitions">
        <P>Terms used in this DPA have the meanings given in the UK GDPR and the
          Data Protection Act 2018:
        </P>
        <Ul items={[
          '"Personal Data" — any information relating to an identified or identifiable natural person',
          '"Processing" — any operation performed on personal data',
          '"Data Subject" — the individual to whom personal data relates',
          '"Supervisory Authority" — the relevant national data protection authority',
        ]} />
      </Section>

      <Section heading="3. Processor Obligations">
        <P>Altrera Industries shall:</P>
        <Ul items={[
          'Process personal data only on documented instructions from the Controller',
          'Ensure that persons authorised to process data are bound by confidentiality',
          'Implement appropriate technical and organisational security measures',
          'Assist the Controller in responding to Data Subject rights requests',
          'Delete or return all personal data upon termination, at the Controller\'s election',
          'Make available information necessary to demonstrate compliance with this DPA',
        ]} />
      </Section>

      <Section heading="4. Controller Obligations">
        <P>
          The Controller warrants that it has a lawful basis under the UK GDPR and
          the Data Protection Act 2018 for the personal data provided to the Service,
          and that its instructions comply with applicable data protection law.
        </P>
      </Section>

      <Section heading="5. Sub-processors">
        <P>
          The Controller authorises the use of sub-processors listed on our{' '}
          <a href="/legal/subprocessors" className="text-[#4a5c4e] underline underline-offset-2">
            Subprocessors page
          </a>
          . Altrera Industries will notify the Controller of any intended changes and
          provide 30 days to object before engaging a new sub-processor.
        </P>
      </Section>

      <Section heading="6. Security">
        <P>
          Altrera Industries maintains the technical and organisational measures
          described in our{' '}
          <a href="/legal/security" className="text-[#4a5c4e] underline underline-offset-2">
            Security page
          </a>
          . We will notify the Controller without undue delay (and in any event within
          72 hours) upon becoming aware of a personal data breach.
        </P>
      </Section>

      <Section heading="7. International Transfers">
        <P>
          Where personal data is transferred outside the UK, we rely on the UK
          International Data Transfer Agreement (IDTA), as approved by the Secretary
          of State, or another mechanism approved by the ICO.
        </P>
      </Section>

      <Section heading="8. Audit Rights">
        <P>
          Altrera Industries will provide all information reasonably necessary to
          demonstrate compliance with this DPA and will allow for and contribute to
          audits conducted by the Controller or a mandated auditor, subject to
          reasonable notice and confidentiality obligations.
        </P>
      </Section>

      <Section heading="9. Term & Termination">
        <P>
          This DPA remains in force for the duration of the main service agreement.
          Upon termination, Altrera Industries will delete or return personal data
          within 90 days.
        </P>
      </Section>

      <Section heading="10. Contact">
        <P>
          To execute a signed DPA or for questions, contact{' '}
          <a href="mailto:legal@altrera.com" className="text-[#4a5c4e] underline underline-offset-2">
            legal@altrera.com
          </a>
          .
        </P>
      </Section>
    </LegalPage>
  )
}

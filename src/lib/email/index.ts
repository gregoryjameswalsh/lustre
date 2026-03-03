// src/lib/email/index.ts
// =============================================================================
// LUSTRE — Email via Resend
// =============================================================================

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface SendQuoteEmailParams {
  // Recipient
  clientEmail: string
  clientName: string

  // Quote
  quoteNumber: string
  quoteTitle: string
  quoteTotal: number
  quoteValidUntil: string | null
  acceptUrl: string

  // Org (sender context)
  orgName: string
  orgEmail: string   // reply-to
  orgPhone: string | null
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)
}

function formatDate(date: string | null) {
  if (!date) return null
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
}

// -----------------------------------------------------------------------------
// Quote email template (inline HTML — no external deps)
// -----------------------------------------------------------------------------

function quoteEmailHtml(params: SendQuoteEmailParams): string {
  const {
    clientName, quoteNumber, quoteTitle, quoteTotal,
    quoteValidUntil, acceptUrl, orgName, orgPhone
  } = params

  const validUntilLine = quoteValidUntil
    ? `<p style="margin:0 0 8px;color:#6b7280;font-size:14px;">This quote is valid until <strong>${formatDate(quoteValidUntil)}</strong>.</p>`
    : ''

  const phoneLine = orgPhone
    ? `<p style="margin:4px 0 0;color:#6b7280;font-size:13px;">${orgPhone}</p>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quote ${quoteNumber} from ${orgName}</title>
</head>
<body style="margin:0;padding:0;background:#f9f8f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f8f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:24px;">
              <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#4a5c4e;">
                ${orgName}
              </p>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;padding:32px;">

              <!-- Greeting -->
              <p style="margin:0 0 16px;font-size:16px;color:#0c0c0b;">
                Hi ${clientName},
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                Please find your quote below. You can review the details and let us know if you'd like to go ahead.
              </p>

              <!-- Quote summary box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f8f5;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#9ca3af;">
                      Quote ${quoteNumber}
                    </p>
                    <p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#0c0c0b;">
                      ${quoteTitle}
                    </p>
                    <p style="margin:0 0 16px;font-size:28px;font-weight:300;color:#0c0c0b;">
                      ${formatCurrency(quoteTotal)}
                    </p>
                    ${validUntilLine}
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="${acceptUrl}"
                       style="display:inline-block;background:#4a5c4e;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;padding:14px 32px;border-radius:100px;">
                      View &amp; Accept Quote
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Secondary note -->
              <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;line-height:1.5;">
                You can also decline from the same link if you'd prefer not to proceed.<br>
                If you have any questions, just reply to this email.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">${orgName}</p>
              ${phoneLine}
              <p style="margin:8px 0 0;color:#d1d5db;font-size:11px;">
                Powered by Lustre
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function quoteEmailText(params: SendQuoteEmailParams): string {
  const { clientName, quoteNumber, quoteTitle, quoteTotal, quoteValidUntil, acceptUrl, orgName } = params
  return [
    `Hi ${clientName},`,
    '',
    `${orgName} has sent you a quote.`,
    '',
    `Quote: ${quoteNumber}`,
    `${quoteTitle}`,
    `Total: ${formatCurrency(quoteTotal)}`,
    quoteValidUntil ? `Valid until: ${formatDate(quoteValidUntil)}` : '',
    '',
    `View and accept your quote here:`,
    acceptUrl,
    '',
    `If you have any questions, reply to this email.`,
    '',
    `— ${orgName}`,
  ].filter(line => line !== undefined).join('\n')
}

// -----------------------------------------------------------------------------
// Send quote email
// -----------------------------------------------------------------------------

export async function sendQuoteEmail(params: SendQuoteEmailParams): Promise<{ error?: string }> {
  const { clientEmail, clientName, quoteNumber, orgEmail } = params
  // Strip newlines to prevent email header injection
  const orgName = params.orgName.replace(/[\r\n]/g, ' ').trim()

  try {
    const { error } = await resend.emails.send({
      from:     `${orgName} <hello@simplylustre.com>`,
      to:       clientEmail,
      replyTo:  orgEmail,
      subject:  `Your quote from ${orgName} — ${quoteNumber}`,
      html:     quoteEmailHtml(params),
      text:     quoteEmailText(params),
    })

    if (error) {
      console.error('Resend error:', error)
      return { error: 'Failed to send email.' }
    }

    return {}
  } catch (err) {
    console.error('Email send exception:', err)
    return { error: 'Failed to send email.' }
  }
}
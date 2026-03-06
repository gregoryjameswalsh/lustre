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
  orgEmail: string         // reply-to
  orgPhone: string | null
  customFromEmail?: string // if set and DNS-verified, used as the from address
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
// Operator notification types
// -----------------------------------------------------------------------------

export interface SendOperatorResponseNotificationParams {
  orgEmail:    string          // to: the operator's contact email
  orgName:     string
  clientName:  string
  quoteNumber: string
  quoteTitle:  string
  quoteTotal:  number
  response:    'accepted' | 'declined'
  dashboardUrl: string         // link to the quote in the operator dashboard
}

export interface SendOperatorViewedNotificationParams {
  orgEmail:    string
  orgName:     string
  clientName:  string
  quoteNumber: string
  quoteTitle:  string
  dashboardUrl: string
}

// -----------------------------------------------------------------------------
// Operator notification templates
// -----------------------------------------------------------------------------

function operatorResponseHtml(params: SendOperatorResponseNotificationParams): string {
  const { clientName, quoteNumber, quoteTitle, quoteTotal, response, orgName, dashboardUrl } = params
  const accepted = response === 'accepted'

  const statusBadge = accepted
    ? `<span style="display:inline-block;background:#d1fae5;color:#065f46;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;padding:3px 10px;border-radius:100px;">Accepted</span>`
    : `<span style="display:inline-block;background:#fef3c7;color:#92400e;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;padding:3px 10px;border-radius:100px;">Declined</span>`

  const bodyText = accepted
    ? `<strong>${clientName}</strong> has accepted your quote. A job has been automatically created in your dashboard.`
    : `<strong>${clientName}</strong> has declined your quote.`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quote ${quoteNumber} ${response}</title>
</head>
<body style="margin:0;padding:0;background:#f9f8f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f8f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <tr>
            <td style="padding-bottom:24px;">
              <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#4a5c4e;">
                ${orgName}
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;padding:32px;">

              <p style="margin:0 0 20px;">${statusBadge}</p>

              <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
                ${bodyText}
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f8f5;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 2px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#9ca3af;">
                      Quote ${quoteNumber}
                    </p>
                    <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#0c0c0b;">${quoteTitle}</p>
                    <p style="margin:0;font-size:22px;font-weight:300;color:#0c0c0b;">${formatCurrency(quoteTotal)}</p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}"
                       style="display:inline-block;background:#4a5c4e;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;padding:14px 32px;border-radius:100px;">
                      View in dashboard
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;color:#d1d5db;font-size:11px;">Lustre · quote notifications</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function operatorViewedHtml(params: SendOperatorViewedNotificationParams): string {
  const { clientName, quoteNumber, quoteTitle, orgName, dashboardUrl } = params

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quote ${quoteNumber} opened</title>
</head>
<body style="margin:0;padding:0;background:#f9f8f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f8f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <tr>
            <td style="padding-bottom:24px;">
              <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#4a5c4e;">
                ${orgName}
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;padding:32px;">

              <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
                <strong>${clientName}</strong> just opened your quote.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f8f5;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 2px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#9ca3af;">
                      Quote ${quoteNumber}
                    </p>
                    <p style="margin:0;font-size:15px;font-weight:600;color:#0c0c0b;">${quoteTitle}</p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}"
                       style="display:inline-block;background:#4a5c4e;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;padding:14px 32px;border-radius:100px;">
                      View in dashboard
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;color:#d1d5db;font-size:11px;">Lustre · quote notifications</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// -----------------------------------------------------------------------------
// Send operator notifications
// -----------------------------------------------------------------------------

export async function sendOperatorResponseNotification(
  params: SendOperatorResponseNotificationParams
): Promise<void> {
  const { orgEmail, orgName, clientName, quoteNumber, response } = params
  const verb = response === 'accepted' ? 'accepted' : 'declined'
  const safeOrgName = orgName.replace(/[\r\n]/g, ' ').trim()
  const safeClientName = clientName.replace(/[\r\n]/g, ' ').trim()

  try {
    await resend.emails.send({
      from:    `Lustre <hello@simplylustre.com>`,
      to:      orgEmail,
      subject: `${safeClientName} ${verb} your quote — ${quoteNumber}`,
      html:    operatorResponseHtml({ ...params, orgName: safeOrgName, clientName: safeClientName }),
      text:    [
        `${safeClientName} ${verb} your quote.`,
        '',
        `Quote: ${quoteNumber}`,
        params.quoteTitle,
        `Total: ${formatCurrency(params.quoteTotal)}`,
        '',
        response === 'accepted' ? 'A job has been automatically created in your dashboard.' : '',
        '',
        `View in dashboard: ${params.dashboardUrl}`,
      ].filter(l => l !== undefined).join('\n'),
    })
  } catch (err) {
    // Notifications are best-effort — never block the primary action
    console.error('Operator response notification failed:', err)
  }
}

export async function sendOperatorViewedNotification(
  params: SendOperatorViewedNotificationParams
): Promise<void> {
  const { orgEmail, orgName, clientName, quoteNumber } = params
  const safeOrgName = orgName.replace(/[\r\n]/g, ' ').trim()
  const safeClientName = clientName.replace(/[\r\n]/g, ' ').trim()

  try {
    await resend.emails.send({
      from:    `Lustre <hello@simplylustre.com>`,
      to:      orgEmail,
      subject: `${safeClientName} opened your quote — ${quoteNumber}`,
      html:    operatorViewedHtml({ ...params, orgName: safeOrgName, clientName: safeClientName }),
      text:    [
        `${safeClientName} just opened your quote.`,
        '',
        `Quote: ${quoteNumber}`,
        params.quoteTitle,
        '',
        `View in dashboard: ${params.dashboardUrl}`,
      ].join('\n'),
    })
  } catch (err) {
    console.error('Operator viewed notification failed:', err)
  }
}

// -----------------------------------------------------------------------------
// Send quote email
// -----------------------------------------------------------------------------

export async function sendQuoteEmail(params: SendQuoteEmailParams): Promise<{ error?: string }> {
  const { clientEmail, quoteNumber, orgEmail, customFromEmail } = params
  // Strip newlines to prevent email header injection
  const orgName = params.orgName.replace(/[\r\n]/g, ' ').trim()
  const fromAddress = customFromEmail ?? 'hello@simplylustre.com'

  try {
    const { error } = await resend.emails.send({
      from:     `${orgName} <${fromAddress}>`,
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
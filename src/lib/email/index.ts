// src/lib/email/index.ts
// =============================================================================
// LUSTRE — Email via Resend
// =============================================================================

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface SendInvitationEmailParams {
  inviteeEmail:  string
  inviterName:   string
  orgName:       string
  role:          string
  acceptUrl:     string
  expiresAt:     string   // ISO date string
}

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
  orgLogoUrl?: string | null
  orgBrandColor?: string | null
}

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
    quoteValidUntil, acceptUrl, orgName, orgPhone,
    orgLogoUrl, orgBrandColor,
  } = params

  const brand = orgBrandColor ?? '#4a5c4e'

  const validUntilLine = quoteValidUntil
    ? `<p style="margin:0 0 8px;color:#6b7280;font-size:14px;">This quote is valid until <strong>${formatDate(quoteValidUntil)}</strong>.</p>`
    : ''

  const phoneLine = orgPhone
    ? `<p style="margin:4px 0 0;color:#6b7280;font-size:13px;">${orgPhone}</p>`
    : ''

  const headerContent = orgLogoUrl
    ? `<img src="${orgLogoUrl}" alt="${orgName}" style="max-height:48px;max-width:180px;display:block;object-fit:contain;" />`
    : `<p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:${brand};">${orgName}</p>`

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
              ${headerContent}
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
                       style="display:inline-block;background:${brand};color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;padding:14px 32px;border-radius:100px;">
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
  const { clientEmail, quoteNumber, orgEmail, customFromEmail } = params
  // Strip newlines to prevent email header injection
  const orgName = params.orgName.replace(/[\r\n]/g, ' ').trim()
  const fromAddress = customFromEmail
    ? `${orgName} <${customFromEmail}>`
    : `${orgName} <hello@simplylustre.com>`

  try {
    const { error } = await resend.emails.send({
      from:     fromAddress,
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
// Invitation email
// -----------------------------------------------------------------------------

function invitationEmailHtml(params: SendInvitationEmailParams): string {
  const { inviterName, orgName, role, acceptUrl, expiresAt } = params
  const roleLabel = role === 'admin' ? 'Admin' : 'Team member'
  const expiry = new Date(expiresAt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  })

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You've been invited to join ${orgName} on Lustre</title>
</head>
<body style="margin:0;padding:0;background:#f9f8f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f8f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <tr>
            <td style="padding-bottom:24px;">
              <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#4a5c4e;">
                Lustre
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;padding:32px;">
              <p style="margin:0 0 16px;font-size:16px;color:#0c0c0b;">
                You've been invited to join <strong>${orgName}</strong>
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                ${inviterName} has invited you to join their team on Lustre as a <strong>${roleLabel}</strong>.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f8f5;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#9ca3af;">
                      Organisation
                    </p>
                    <p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#0c0c0b;">
                      ${orgName}
                    </p>
                    <p style="margin:0;font-size:13px;color:#6b7280;">
                      Role: ${roleLabel}
                    </p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="${acceptUrl}"
                       style="display:inline-block;background:#4a5c4e;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;padding:14px 32px;border-radius:100px;">
                      Accept invitation
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;line-height:1.5;">
                This invitation expires on ${expiry}.<br>
                If you weren't expecting this, you can safely ignore it.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;color:#d1d5db;font-size:11px;">Powered by Lustre</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function invitationEmailText(params: SendInvitationEmailParams): string {
  const { inviterName, orgName, role, acceptUrl, expiresAt } = params
  const roleLabel = role === 'admin' ? 'Admin' : 'Team member'
  const expiry = new Date(expiresAt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
  return [
    `You've been invited to join ${orgName} on Lustre`,
    '',
    `${inviterName} has invited you to join their team as a ${roleLabel}.`,
    '',
    `Accept your invitation here:`,
    acceptUrl,
    '',
    `This invitation expires on ${expiry}.`,
    `If you weren't expecting this, you can safely ignore it.`,
  ].join('\n')
}

export async function sendInvitationEmail(
  params: SendInvitationEmailParams
): Promise<{ error?: string }> {
  const { inviteeEmail, orgName } = params
  const cleanOrgName = orgName.replace(/[\r\n]/g, ' ').trim()

  try {
    const { error } = await resend.emails.send({
      from:    `Lustre <hello@simplylustre.com>`,
      to:      inviteeEmail,
      subject: `You've been invited to join ${cleanOrgName} on Lustre`,
      html:    invitationEmailHtml({ ...params, orgName: cleanOrgName }),
      text:    invitationEmailText({ ...params, orgName: cleanOrgName }),
    })

    if (error) {
      console.error('Resend error (invitation):', error)
      return { error: 'Failed to send invitation email.' }
    }

    return {}
  } catch (err) {
    console.error('Invitation email exception:', err)
    return { error: 'Failed to send invitation email.' }
  }
}

// -----------------------------------------------------------------------------
// Cron digest types
// -----------------------------------------------------------------------------

export interface ExpiredQuote {
  quoteNumber: string
  title:       string
  total:       number
  clientName:  string
  validUntil:  string
  dashboardUrl: string
}

export interface DueFollowUp {
  title:      string
  clientName: string
  dueDate:    string
  priority:   string
  notes:      string | null
}

// -----------------------------------------------------------------------------
// Expired quotes digest (sent to operator once per day for newly-expired quotes)
// -----------------------------------------------------------------------------

function expiredQuotesHtml(orgName: string, quotes: ExpiredQuote[]): string {
  const rows = quotes.map(q => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;vertical-align:top;">
        <p style="margin:0 0 2px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#9ca3af;">
          ${q.quoteNumber}
        </p>
        <p style="margin:0 0 2px;font-size:14px;color:#0c0c0b;">${q.title}</p>
        <p style="margin:0;font-size:13px;color:#6b7280;">${q.clientName} &middot; ${formatCurrency(q.total)}</p>
      </td>
      <td style="padding:12px 0 12px 16px;border-bottom:1px solid #f3f4f6;vertical-align:top;text-align:right;white-space:nowrap;">
        <a href="${q.dashboardUrl}" style="font-size:12px;color:#4a5c4e;text-decoration:underline;">View</a>
      </td>
    </tr>`).join('')

  const count = quotes.length
  const heading = count === 1
    ? '1 quote expired without a response'
    : `${count} quotes expired without a response`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${heading}</title>
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

              <p style="margin:0 0 6px;font-size:16px;color:#0c0c0b;">${heading}</p>
              <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.5;">
                You may want to follow up with these clients directly.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0">
                ${rows}
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                <tr>
                  <td align="center">
                    <a href="${quotes[0].dashboardUrl.replace(/\/quotes\/[^/]+$/, '/quotes')}"
                       style="display:inline-block;background:#4a5c4e;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;padding:14px 32px;border-radius:100px;">
                      View all quotes
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;color:#d1d5db;font-size:11px;">Lustre · quote notifications</p>
              <p style="margin:0;color:#d1d5db;font-size:11px;">Powered by Lustre</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendExpiredQuotesDigest(
  orgEmail: string,
  orgName:  string,
  quotes:   ExpiredQuote[]
): Promise<void> {
  if (quotes.length === 0) return
  const safe = orgName.replace(/[\r\n]/g, ' ').trim()
  const count = quotes.length
  const subject = count === 1
    ? `1 quote expired — follow up with your client`
    : `${count} quotes expired — follow up with your clients`

  try {
    await resend.emails.send({
      from:    `Lustre <hello@simplylustre.com>`,
      to:      orgEmail,
      subject,
      html:    expiredQuotesHtml(safe, quotes),
      text:    [
        `${count === 1 ? '1 quote' : `${count} quotes`} expired without a response.`,
        '',
        ...quotes.map(q => `• ${q.quoteNumber} — ${q.title} (${q.clientName}, ${formatCurrency(q.total)})`),
        '',
        'You may want to follow up with these clients directly.',
      ].join('\n'),
    })
  } catch (err) {
    console.error('Expired quotes digest failed:', err)
  }
}

// -----------------------------------------------------------------------------
// Follow-up reminders digest
// -----------------------------------------------------------------------------

const priorityLabel: Record<string, string> = {
  urgent: 'Urgent',
  high:   'High',
  normal: 'Normal',
  low:    'Low',
}

function followUpDigestHtml(orgName: string, followUps: DueFollowUp[], dashboardUrl: string): string {
  const rows = followUps.map(f => {
    const due      = new Date(f.dueDate)
    const today    = new Date()
    const diffMs   = today.setHours(0,0,0,0) - due.setHours(0,0,0,0)
    const diffDays = Math.round(diffMs / 86400000)
    const dueLabel = diffDays <= 0 ? 'Due today'
      : diffDays === 1 ? 'Overdue by 1 day'
      : `Overdue by ${diffDays} days`

    const priorityColour = f.priority === 'urgent' ? '#991b1b'
      : f.priority === 'high'   ? '#92400e'
      : '#6b7280'

    return `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;vertical-align:top;">
        <p style="margin:0 0 2px;">
          <span style="font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${priorityColour};">${priorityLabel[f.priority] ?? f.priority}</span>
        </p>
        <p style="margin:0 0 2px;font-size:14px;color:#0c0c0b;">${f.title}</p>
        <p style="margin:0;font-size:13px;color:#6b7280;">${f.clientName} &middot; ${dueLabel}</p>
        ${f.notes ? `<p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">${f.notes}</p>` : ''}
      </td>
    </tr>`
  }).join('')

  const count = followUps.length
  const heading = count === 1
    ? '1 follow-up is due'
    : `${count} follow-ups are due`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${heading}</title>
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

              <p style="margin:0 0 24px;font-size:16px;color:#0c0c0b;">${heading}</p>

              <table width="100%" cellpadding="0" cellspacing="0">
                ${rows}
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}"
                       style="display:inline-block;background:#4a5c4e;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;padding:14px 32px;border-radius:100px;">
                      Open dashboard
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;color:#d1d5db;font-size:11px;">Lustre · follow-up reminders</p>
              <p style="margin:0;color:#d1d5db;font-size:11px;">Powered by Lustre</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendFollowUpDigest(
  orgEmail:     string,
  orgName:      string,
  followUps:    DueFollowUp[],
  dashboardUrl: string
): Promise<void> {
  if (followUps.length === 0) return
  const safe  = orgName.replace(/[\r\n]/g, ' ').trim()
  const count = followUps.length
  const subject = count === 1 ? `1 follow-up due today` : `${count} follow-ups due today`

  try {
    await resend.emails.send({
      from:    `Lustre <hello@simplylustre.com>`,
      to:      orgEmail,
      subject,
      html:    followUpDigestHtml(safe, followUps, dashboardUrl),
      text:    [
        `${count === 1 ? '1 follow-up' : `${count} follow-ups`} due today:`,
        '',
        ...followUps.map(f => `• [${(priorityLabel[f.priority] ?? f.priority).toUpperCase()}] ${f.title} — ${f.clientName}`),
        '',
        `Open your dashboard: ${dashboardUrl}`,
      ].join('\n'),
    })
  } catch (err) {
    console.error('Follow-up digest failed:', err)
  }
}

// =============================================================================
// Trial nurture email sequence
// 5 emails sent over the 14-day trial: Day 1, 7, 10, 13, 14.
// Day 1 is triggered on onboarding completion; Days 7–14 via a daily cron job.
// =============================================================================

export type TrialEmailKey = 'day1' | 'day7' | 'day10' | 'day13' | 'day14'

export interface SendTrialEmailParams {
  to:      string   // admin email
  orgName: string
  key:     TrialEmailKey
  upgradeUrl: string
}

const TRIAL_EMAIL_CONFIG: Record<TrialEmailKey, { subject: string; heading: string; body: string; cta: string }> = {
  day1: {
    subject: 'Your 14-day Lustre trial has started',
    heading: 'Welcome to Lustre',
    body:    'Your 14-day free trial is live. Here\'s what you can do right now: send your first professional quote, track your clients and jobs, and see how much time you save on admin.',
    cta:     'Go to your dashboard',
  },
  day7: {
    subject: 'Halfway through your Lustre trial — 7 days left',
    heading: '7 days in',
    body:    'You\'re halfway through your trial. If you haven\'t sent your first quote yet, now\'s the time. It takes less than 3 minutes and looks better than anything you\'ve sent before.',
    cta:     'Send your first quote',
  },
  day10: {
    subject: '4 days left on your Lustre trial',
    heading: '4 days remaining',
    body:    'Your trial ends in 4 days. Starter plans start at £39/month — that\'s less than the admin time you\'ll save on a single job. No credit card required until you\'re ready.',
    cta:     'Choose a plan',
  },
  day13: {
    subject: 'Last chance — your Lustre trial ends tomorrow',
    heading: 'Trial ends tomorrow',
    body:    'Your free trial expires tomorrow. Upgrade now to keep access to all your clients, quotes, and jobs. Your data is safe — it\'ll be right where you left it.',
    cta:     'Upgrade now',
  },
  day14: {
    subject: 'Your Lustre trial has ended',
    heading: 'Your trial has ended',
    body:    'Your 14-day free trial has come to an end. Your account and all your data are still here — choose a plan to get back in and pick up where you left off.',
    cta:     'Reactivate your account',
  },
}

function trialEmailHtml(params: SendTrialEmailParams): string {
  const { orgName, key, upgradeUrl } = params
  const cfg = TRIAL_EMAIL_CONFIG[key]

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${cfg.subject}</title>
</head>
<body style="margin:0;padding:0;background:#f9f8f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f8f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <tr>
            <td style="padding-bottom:24px;">
              <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#4a5c4e;">
                Lustre
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;padding:32px;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#9ca3af;">
                ${orgName}
              </p>
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:300;color:#0c0c0b;">
                ${cfg.heading}
              </h1>
              <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.65;">
                ${cfg.body}
              </p>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left">
                    <a href="${upgradeUrl}"
                       style="display:inline-block;background:#4a5c4e;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;padding:14px 32px;border-radius:100px;">
                      ${cfg.cta}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;color:#d1d5db;font-size:11px;">
                Powered by Lustre &nbsp;·&nbsp;
                <a href="${upgradeUrl.replace(/\/dashboard.*/, '/auth/signout')}"
                   style="color:#d1d5db;text-decoration:none;">Unsubscribe</a>
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

function trialEmailText(params: SendTrialEmailParams): string {
  const { orgName, key, upgradeUrl } = params
  const cfg = TRIAL_EMAIL_CONFIG[key]
  return [
    `${cfg.heading} — ${orgName}`,
    '',
    cfg.body,
    '',
    `${cfg.cta}:`,
    upgradeUrl,
  ].join('\n')
}

// =============================================================================
// Invoice email
// =============================================================================

export interface SendInvoiceEmailParams {
  clientEmail:     string
  clientName:      string
  invoiceNumber:   string
  total:           number
  dueDate:         string
  invoiceUrl:      string
  orgName:         string
  orgEmail:        string
  orgPhone:        string | null
  customFromEmail?: string
}

function invoiceEmailHtml(params: SendInvoiceEmailParams): string {
  const { clientName, invoiceNumber, total, dueDate, invoiceUrl, orgName, orgPhone } = params

  const phoneLine = orgPhone
    ? `<p style="margin:4px 0 0;color:#6b7280;font-size:13px;">${orgPhone}</p>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoiceNumber} from ${orgName}</title>
</head>
<body style="margin:0;padding:0;background:#f9f8f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f8f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <tr>
            <td style="padding-bottom:24px;">
              <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#4a5c4e;">${orgName}</p>
            </td>
          </tr>

          <tr>
            <td style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;padding:32px;">

              <p style="margin:0 0 16px;font-size:16px;color:#0c0c0b;">Hi ${clientName},</p>
              <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                Please find your invoice below. You can view and pay it securely online.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f8f5;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#9ca3af;">Invoice ${invoiceNumber}</p>
                    <p style="margin:0 0 8px;font-size:28px;font-weight:300;color:#0c0c0b;">${formatCurrency(total)}</p>
                    <p style="margin:0;color:#6b7280;font-size:14px;">Due ${formatDate(dueDate)}</p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="${invoiceUrl}"
                       style="display:inline-block;background:#4a5c4e;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;padding:14px 32px;border-radius:100px;">
                      View &amp; Pay Invoice
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;line-height:1.5;">
                If you have any questions, reply to this email.
              </p>

            </td>
          </tr>

          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">${orgName}</p>
              ${phoneLine}
              <p style="margin:8px 0 0;color:#d1d5db;font-size:11px;">Powered by Lustre</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendInvoiceEmail(params: SendInvoiceEmailParams): Promise<void> {
  const { clientEmail, invoiceNumber, orgEmail, customFromEmail } = params
  const safeOrgName = params.orgName.replace(/[\r\n]/g, ' ').trim()
  const fromAddress = customFromEmail
    ? `${safeOrgName} <${customFromEmail}>`
    : `${safeOrgName} <hello@simplylustre.com>`

  try {
    await resend.emails.send({
      from:    fromAddress,
      to:      clientEmail,
      replyTo: orgEmail,
      subject: `Invoice ${invoiceNumber} from ${safeOrgName}`,
      html:    invoiceEmailHtml({ ...params, orgName: safeOrgName }),
      text:    [
        `Hi ${params.clientName},`,
        '',
        `${safeOrgName} has sent you an invoice.`,
        '',
        `Invoice: ${invoiceNumber}`,
        `Amount: ${formatCurrency(params.total)}`,
        `Due: ${formatDate(params.dueDate)}`,
        '',
        `View and pay your invoice here:`,
        params.invoiceUrl,
      ].join('\n'),
    })
  } catch (err) {
    // Non-blocking — caller decides how to handle
    console.error('Invoice email failed:', err)
  }
}

// =============================================================================
// Invoice overdue reminder (dunning)
// =============================================================================

export interface SendInvoiceOverdueReminderParams {
  clientEmail:      string
  clientName:       string
  invoiceNumber:    string
  total:            number
  amountPaid:       number
  dueDate:          string
  invoiceUrl:       string
  orgName:          string
  orgEmail:         string
  customFromEmail?: string
  dunningStep:      number   // 1 = first reminder, 2 = follow-up, 3 = final
}

function overdueReminderHtml(params: SendInvoiceOverdueReminderParams): string {
  const {
    clientName, invoiceNumber, total, amountPaid, dueDate,
    invoiceUrl, orgName, dunningStep,
  } = params

  const outstanding = Math.max(0, total - amountPaid)
  const urgency =
    dunningStep === 3 ? 'This is our final reminder before the matter is escalated.' :
    dunningStep === 2 ? 'This is a follow-up reminder. Please arrange payment at your earliest convenience.' :
                        'This invoice is now overdue. Please arrange payment as soon as possible.'

  const subject =
    dunningStep === 3 ? `Final notice — Invoice ${invoiceNumber} is overdue` :
    dunningStep === 2 ? `Reminder — Invoice ${invoiceNumber} is still outstanding` :
                        `Invoice ${invoiceNumber} is overdue`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f9f8f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f8f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <tr>
            <td style="padding-bottom:24px;">
              <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#4a5c4e;">${orgName}</p>
            </td>
          </tr>

          <tr>
            <td style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;padding:32px;">

              <p style="margin:0 0 16px;font-size:16px;color:#0c0c0b;">Hi ${clientName},</p>
              <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">${urgency}</p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border-radius:8px;margin-bottom:24px;border:1px solid #fecaca;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#9ca3af;">Invoice ${invoiceNumber}</p>
                    <p style="margin:0 0 4px;font-size:28px;font-weight:300;color:#dc2626;">${formatCurrency(outstanding)} outstanding</p>
                    <p style="margin:0;color:#6b7280;font-size:14px;">Was due ${formatDate(dueDate)}</p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="${invoiceUrl}"
                       style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;padding:14px 32px;border-radius:100px;">
                      Pay Now
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;line-height:1.5;">
                If you believe this is an error or have already arranged payment, please reply to this email.
              </p>

            </td>
          </tr>

          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">${orgName}</p>
              <p style="margin:8px 0 0;color:#d1d5db;font-size:11px;">Powered by Lustre</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendInvoiceOverdueReminder(
  params: SendInvoiceOverdueReminderParams
): Promise<{ error?: string }> {
  const { clientEmail, invoiceNumber, orgEmail, customFromEmail, dunningStep } = params
  const safeOrgName = params.orgName.replace(/[\r\n]/g, ' ').trim()
  const fromAddress = customFromEmail
    ? `${safeOrgName} <${customFromEmail}>`
    : `${safeOrgName} <hello@simplylustre.com>`

  const subject =
    dunningStep === 3 ? `Final notice — Invoice ${invoiceNumber} is overdue` :
    dunningStep === 2 ? `Reminder — Invoice ${invoiceNumber} is still outstanding` :
                        `Invoice ${invoiceNumber} is overdue`

  const outstanding = Math.max(0, params.total - params.amountPaid)

  try {
    const { error } = await resend.emails.send({
      from:    fromAddress,
      to:      clientEmail,
      replyTo: orgEmail,
      subject,
      html:    overdueReminderHtml({ ...params, orgName: safeOrgName }),
      text:    [
        `Hi ${params.clientName},`,
        '',
        subject + '.',
        '',
        `Invoice: ${invoiceNumber}`,
        `Outstanding: ${formatCurrency(outstanding)}`,
        `Was due: ${formatDate(params.dueDate)}`,
        '',
        `Please pay here:`,
        params.invoiceUrl,
      ].join('\n'),
    })
    if (error) {
      console.error(`Overdue reminder email failed (step ${dunningStep}):`, error)
      return { error: 'Failed to send overdue reminder.' }
    }
    return {}
  } catch (err) {
    console.error('Overdue reminder email exception:', err)
    return { error: 'Failed to send overdue reminder.' }
  }
}

export async function sendTrialEmail(params: SendTrialEmailParams): Promise<{ error?: string }> {
  const { to, key } = params
  const cfg = TRIAL_EMAIL_CONFIG[key]

  try {
    const { error } = await resend.emails.send({
      from:    `Lustre <hello@simplylustre.com>`,
      to,
      subject: cfg.subject,
      html:    trialEmailHtml(params),
      text:    trialEmailText(params),
    })

    if (error) {
      console.error(`Resend error (trial ${key}):`, error)
      return { error: `Failed to send trial email (${key}).` }
    }

    return {}
  } catch (err) {
    console.error(`Trial email exception (${key}):`, err)
    return { error: `Failed to send trial email (${key}).` }
  }
}

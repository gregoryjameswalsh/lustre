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
  <title>Expired quotes</title>
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
// Follow-up reminders digest (sent to operator once per due follow-up)
// -----------------------------------------------------------------------------

const priorityLabel: Record<string, string> = {
  urgent: 'Urgent',
  high:   'High',
  normal: 'Normal',
  low:    'Low',
}

function followUpDigestHtml(orgName: string, followUps: DueFollowUp[], dashboardUrl: string): string {
  const rows = followUps.map(f => {
    const due     = new Date(f.dueDate)
    const today   = new Date()
    const diffMs  = today.setHours(0,0,0,0) - due.setHours(0,0,0,0)
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
  <title>Follow-ups due</title>
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
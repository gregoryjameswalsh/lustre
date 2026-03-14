// src/app/api/portal/calendar/[token]/route.ts
// =============================================================================
// LUSTRE — Public iCal subscription feed for portal clients.
//
// URL: /api/portal/calendar/[calendar_token].ics
// Auth: token-based (stored as clients.calendar_token — 48-char hex string)
// No session required — clients add this URL to Google Calendar / Apple Calendar.
//
// Format: RFC 5545 iCalendar
// =============================================================================

import { NextResponse }    from 'next/server'
import { createAnonClient } from '@/lib/supabase/anon'

function escapeIcal(str: string | null | undefined): string {
  if (!str) return ''
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
}

function icalDate(isoDate: string): string {
  // Convert YYYY-MM-DD to YYYYMMDD
  return isoDate.replace(/-/g, '')
}

function icalDateTime(isoDate: string, time: string | null): string {
  if (!time) return icalDate(isoDate)
  // Combine to YYYYMMDDTHHMMSS (local floating time — no TZ suffix)
  const [h, m] = time.split(':')
  return `${icalDate(isoDate)}T${h.padStart(2, '0')}${(m ?? '00').padStart(2, '0')}00`
}

type JobRow = {
  id:               string
  scheduled_date:   string
  scheduled_time:   string | null
  duration_hours:   number | null
  job_type_name:    string | null
  property_address: string | null
  property_town:    string | null
  status:           string
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  if (!token || token.length < 20) {
    return new NextResponse('Invalid token', { status: 400 })
  }

  const supabase = createAnonClient()

  const { data: raw, error } = await supabase.rpc(
    'portal_get_upcoming_jobs_by_calendar_token',
    { p_token: token }
  )

  if (error) {
    console.error('[ical] rpc error:', error)
    return new NextResponse('Server error', { status: 500 })
  }

  if (raw && (raw as { error?: string }).error) {
    return new NextResponse('Not found', { status: 404 })
  }

  const jobs = (Array.isArray(raw) ? raw : []) as JobRow[]

  const now  = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://simplylustre.com'
  const calName = 'My Visits'

  const vevents = jobs.map(job => {
    const summary  = job.job_type_name ?? 'Visit'
    const location = [job.property_address, job.property_town].filter(Boolean).join(', ')
    const dtstart  = icalDateTime(job.scheduled_date, job.scheduled_time)

    let dtend = dtstart
    if (job.duration_hours && job.scheduled_time) {
      const [h, m] = (job.scheduled_time).split(':')
      const startMinutes = parseInt(h) * 60 + parseInt(m ?? '0')
      const endMinutes   = startMinutes + Math.round(job.duration_hours * 60)
      const endH = Math.floor(endMinutes / 60)
      const endM = endMinutes % 60
      dtend = `${icalDate(job.scheduled_date)}T${String(endH).padStart(2, '0')}${String(endM).padStart(2, '0')}00`
    } else if (!job.scheduled_time) {
      // All-day event: DTSTART is a date, DTEND is next day
      const d = new Date(job.scheduled_date)
      d.setDate(d.getDate() + 1)
      dtend = d.toISOString().split('T')[0].replace(/-/g, '')
    }

    const dateType = job.scheduled_time ? '' : ';VALUE=DATE'
    return [
      'BEGIN:VEVENT',
      `UID:lustre-job-${job.id}@simplylustre.com`,
      `DTSTAMP:${now}`,
      `DTSTART${dateType}:${dtstart}`,
      `DTEND${dateType}:${dtend}`,
      `SUMMARY:${escapeIcal(summary)}`,
      location ? `LOCATION:${escapeIcal(location)}` : '',
      `URL:${appUrl}`,
      'END:VEVENT',
    ].filter(Boolean).join('\r\n')
  })

  const ical = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lustre//Client Portal//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calName}`,
    'X-WR-TIMEZONE:Europe/London',
    ...vevents,
    'END:VCALENDAR',
  ].join('\r\n')

  return new NextResponse(ical, {
    status: 200,
    headers: {
      'Content-Type':        'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="visits.ics"',
      'Cache-Control':       'no-store',
    },
  })
}

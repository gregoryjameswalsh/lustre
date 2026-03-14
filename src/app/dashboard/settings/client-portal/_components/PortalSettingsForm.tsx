'use client'

// src/app/dashboard/settings/client-portal/_components/PortalSettingsForm.tsx
// =============================================================================
// LUSTRE — Portal Settings Form
// =============================================================================

import { useActionState, useState }  from 'react'
import { upsertPortalSettings }      from '@/lib/actions/client-portal'
import type { ClientPortalSettings } from '@/lib/types'

interface Props {
  settings:          ClientPortalSettings | null
  isAdmin:           boolean
  activeClientCount: number
  orgName:           string
}

const initialState = { error: undefined, success: undefined }

export default function PortalSettingsForm({ settings, isAdmin, activeClientCount, orgName }: Props) {
  const [state, formAction, pending] = useActionState(upsertPortalSettings, initialState)

  const [enabled,         setEnabled]         = useState(settings?.portal_enabled         ?? false)
  const [showName,        setShowName]         = useState(settings?.show_team_member_name  ?? true)
  const [showPricing,     setShowPricing]      = useState(settings?.show_job_pricing        ?? false)
  const [shareNotes,      setShareNotes]       = useState(settings?.share_completed_notes   ?? false)
  const [cutoff,          setCutoff]           = useState(settings?.instruction_cutoff_hours ?? 24)
  const [slug,            setSlug]             = useState(settings?.portal_slug             ?? '')
  const [welcomeMessage,  setWelcomeMessage]   = useState(settings?.welcome_message          ?? '')

  const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const previewUrl = slug ? `${appUrl}/portal/${slug}` : null

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <p className="text-sm text-zinc-400">Only admins can configure the Client Portal.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Active clients summary */}
      {settings?.portal_enabled && (
        <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-900">Portal active</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              {activeClientCount} client{activeClientCount !== 1 ? 's' : ''} currently have portal access
            </p>
          </div>
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium tracking-[0.12em] uppercase border border-zinc-200 text-zinc-600 px-4 py-2 rounded-lg hover:border-zinc-400 transition-colors flex-shrink-0"
            >
              Preview portal
            </a>
          )}
        </div>
      )}

      <form action={formAction} className="space-y-6">

        {/* Enable / Disable */}
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-900">Enable Client Portal</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                When enabled, invited clients can log in and view their portal.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="portal_enabled"
                value="true"
                checked={enabled}
                onChange={e => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              {/* Hidden field to send 'false' when unchecked */}
              {!enabled && <input type="hidden" name="portal_enabled" value="false" />}
              <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1A3329]" />
            </label>
          </div>

          {/* Portal slug */}
          <div className="px-6 py-5 border-b border-zinc-100">
            <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-[0.12em]">
              Portal URL
            </label>
            <div className="flex items-center gap-0">
              <span className="text-sm text-zinc-400 bg-zinc-50 border border-r-0 border-zinc-200 rounded-l-lg px-3 py-2.5 select-none whitespace-nowrap">
                {appUrl}/portal/
              </span>
              <input
                type="text"
                name="portal_slug"
                value={slug}
                onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'))}
                placeholder={orgName.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-') || 'my-portal'}
                className="flex-1 border border-zinc-200 rounded-r-lg px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-zinc-400 transition-colors"
              />
            </div>
            <p className="text-xs text-zinc-400 mt-1.5">
              Choose a URL-friendly name. Leave blank to auto-generate from your business name.
            </p>
          </div>

          {/* Welcome message */}
          <div className="px-6 py-5">
            <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-[0.12em]">
              Welcome message <span className="normal-case text-zinc-300">(optional)</span>
            </label>
            <textarea
              name="welcome_message"
              value={welcomeMessage}
              onChange={e => setWelcomeMessage(e.target.value)}
              rows={2}
              placeholder="A short message shown to clients when they log in"
              className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-300 focus:outline-none focus:border-zinc-400 resize-none transition-colors"
            />
          </div>
        </div>

        {/* Visibility settings */}
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100">
            <p className="text-sm font-medium text-zinc-900">Visibility settings</p>
            <p className="text-xs text-zinc-400 mt-0.5">Control what information clients can see in their portal.</p>
          </div>

          {[
            {
              name:    'show_team_member_name',
              label:   'Show team member name',
              desc:    'Clients can see the first name of their assigned cleaner.',
              checked: showName,
              set:     setShowName,
            },
            {
              name:    'show_job_pricing',
              label:   'Show job pricing',
              desc:    'Clients can see the price of each job.',
              checked: showPricing,
              set:     setShowPricing,
            },
            {
              name:    'share_completed_notes',
              label:   'Share completion notes',
              desc:    'Clients can read notes you add on completed jobs.',
              checked: shareNotes,
              set:     setShareNotes,
            },
          ].map(toggle => (
            <div key={toggle.name} className="px-6 py-4 border-b border-zinc-50 last:border-0 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-zinc-700">{toggle.label}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{toggle.desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  name={toggle.name}
                  value="true"
                  checked={toggle.checked}
                  onChange={e => toggle.set(e.target.checked)}
                  className="sr-only peer"
                />
                {!toggle.checked && <input type="hidden" name={toggle.name} value="false" />}
                <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1A3329]" />
              </label>
            </div>
          ))}
        </div>

        {/* Instruction cut-off */}
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="px-6 py-5">
            <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-[0.12em]">
              Instruction cut-off window
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                name="instruction_cutoff_hours"
                value={cutoff}
                onChange={e => setCutoff(Math.max(0, Math.min(168, parseInt(e.target.value) || 0)))}
                min={0}
                max={168}
                className="w-24 border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-zinc-400 transition-colors"
              />
              <span className="text-sm text-zinc-500">hours before the visit</span>
            </div>
            <p className="text-xs text-zinc-400 mt-1.5">
              Clients cannot edit or add instructions within this window. Default: 24 hours.
            </p>
          </div>
        </div>

        {/* Feedback */}
        {state?.error && (
          <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-600">{state.error}</p>
          </div>
        )}
        {state?.success && (
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3">
            <p className="text-sm text-emerald-700">Portal settings saved.</p>
          </div>
        )}

        {/* Save */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-[#1A3329] px-8 py-3 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </form>
    </div>
  )
}

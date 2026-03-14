'use client'

// src/app/portal/[slug]/dashboard/jobs/[id]/_components/InstructionForm.tsx
// =============================================================================
// LUSTRE — Portal Special Instruction Form
//
// Lets the client type and submit a special instruction for an upcoming visit.
// Calls portal_submit_job_instruction() SECURITY DEFINER RPC directly via
// the Supabase client (authenticated session required).
// =============================================================================

import { useState, useEffect } from 'react'
import { createClient }        from '@/lib/supabase/client'

interface Props {
  jobId:               string
  slug:                string
  currentInstruction:  string | null
  cutoffAt:            string | null
}

const MAX_CHARS = 500

export default function InstructionForm({ jobId, slug, currentInstruction, cutoffAt }: Props) {
  const [text,    setText]    = useState(currentInstruction ?? '')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Countdown to cut-off
  const [timeLeft, setTimeLeft] = useState<string | null>(null)

  useEffect(() => {
    if (!cutoffAt) return
    function update() {
      const diff = new Date(cutoffAt!).getTime() - Date.now()
      if (diff <= 0) {
        setTimeLeft(null)
        return
      }
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      if (h > 0) {
        setTimeLeft(`${h}h ${m}m remaining to edit`)
      } else if (m > 0) {
        setTimeLeft(`${m} min remaining to edit`)
      } else {
        setTimeLeft('Less than a minute remaining')
      }
    }
    update()
    const timer = setInterval(update, 30_000)
    return () => clearInterval(timer)
  }, [cutoffAt])

  const charsLeft = MAX_CHARS - text.length
  const isDirty   = text !== (currentInstruction ?? '')

  async function handleSave() {
    if (!text.trim()) return
    setSaving(true)
    setError(null)
    setSuccess(false)

    const supabase = createClient()
    const { data, error: rpcError } = await supabase.rpc('portal_submit_job_instruction', {
      p_job_id:      jobId,
      p_org_slug:    slug,
      p_instruction: text.trim(),
    })

    if (rpcError || (data as { error?: string })?.error) {
      setError((data as { error?: string })?.error ?? 'Failed to save. Please try again.')
      setSaving(false)
      return
    }

    setSuccess(true)
    setSaving(false)
  }

  async function handleClear() {
    if (!currentInstruction) return
    if (!confirm('Remove your instruction for this visit?')) return

    setSaving(true)
    setError(null)

    const supabase = createClient()
    const { data, error: rpcError } = await supabase.rpc('portal_clear_job_instruction', {
      p_job_id:   jobId,
      p_org_slug: slug,
    })

    if (rpcError || (data as { error?: string })?.error) {
      setError((data as { error?: string })?.error ?? 'Failed to remove instruction.')
      setSaving(false)
      return
    }

    setText('')
    setSuccess(false)
    setSaving(false)
  }

  return (
    <div className="space-y-3">

      {/* Example placeholder */}
      <textarea
        value={text}
        onChange={e => { setText(e.target.value.slice(0, MAX_CHARS)); setSuccess(false) }}
        disabled={saving}
        placeholder={'e.g. "Please spend extra time on the bathroom this week, and don\'t worry about the spare room."'}
        rows={4}
        className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-300 focus:border-zinc-400 focus:outline-none resize-none transition-colors leading-relaxed disabled:opacity-60"
      />

      {/* Character count + cut-off countdown */}
      <div className="flex items-center justify-between">
        <span className={`text-xs ${charsLeft < 50 ? 'text-amber-500' : 'text-zinc-300'}`}>
          {charsLeft} characters remaining
        </span>
        {timeLeft && (
          <span className="text-xs text-zinc-300">{timeLeft}</span>
        )}
      </div>

      {/* Feedback */}
      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3">
          <p className="text-xs text-emerald-700">
            Your instruction has been saved. Your cleaner will see it before the visit.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !text.trim() || !isDirty}
          className="rounded-full bg-[#1A3329] px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {saving ? 'Saving…' : currentInstruction ? 'Update instruction' : 'Save instruction'}
        </button>

        {currentInstruction && (
          <button
            onClick={handleClear}
            disabled={saving}
            className="text-xs text-zinc-300 hover:text-red-400 transition-colors"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  )
}

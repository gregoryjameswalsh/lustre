'use client'

// src/app/reset-password/page.tsx
// User lands here after clicking the password reset email link.
// /auth/callback has already exchanged the code for a session, so we
// can call updatePassword directly.

import { useActionState } from 'react'
import { updatePassword } from '@/lib/actions/auth'

export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState(updatePassword, {})

  return (
    <div className="min-h-screen bg-[#f9f8f5] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-10">
          <span className="text-xs font-medium tracking-[0.25em] uppercase text-zinc-800">
            Lustre
          </span>
          <p className="text-xs tracking-widest uppercase text-zinc-400 mt-1">
            Operator Portal
          </p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-lg p-8">
          <h1 className="text-xl font-light tracking-tight text-zinc-900 mb-1">
            Set new password
          </h1>
          <p className="text-sm text-zinc-400 mb-8">
            Choose a strong password for your account.
          </p>

          <form action={action} className="space-y-5">
            <div>
              <label className="block text-xs font-medium tracking-wider uppercase text-zinc-500 mb-2">
                New password
              </label>
              <input
                type="password"
                name="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full border border-zinc-200 rounded-md px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-zinc-400 transition-colors bg-zinc-50"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-xs font-medium tracking-wider uppercase text-zinc-500 mb-2">
                Confirm password
              </label>
              <input
                type="password"
                name="confirm"
                required
                autoComplete="new-password"
                className="w-full border border-zinc-200 rounded-md px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-zinc-400 transition-colors bg-zinc-50"
                placeholder="••••••••"
              />
            </div>

            {state.error && (
              <p className="text-xs text-red-500 tracking-wide">{state.error}</p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full bg-zinc-900 text-[#f9f8f5] text-xs font-medium tracking-[0.15em] uppercase py-3.5 rounded-full hover:bg-[#4a5c4e] transition-colors disabled:opacity-50"
            >
              {pending ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-zinc-300 mt-8 tracking-wider">
          &copy; 2026 Altrera Industries
        </p>
      </div>
    </div>
  )
}

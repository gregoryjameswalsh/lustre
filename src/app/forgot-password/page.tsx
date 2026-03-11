'use client'

// src/app/forgot-password/page.tsx

import { useActionState } from 'react'
import Link from 'next/link'
import { requestPasswordReset } from '@/lib/actions/auth'

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(requestPasswordReset, {})

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
            Reset your password
          </h1>
          <p className="text-sm text-zinc-400 mb-8">
            Enter your email and we&apos;ll send a reset link.
          </p>

          {state.success ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-zinc-700">
                If that email is registered, you&apos;ll receive a reset link shortly.
              </p>
              <Link
                href="/login"
                className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors underline underline-offset-2"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form action={action} className="space-y-5">
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-zinc-500 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  className="w-full border border-zinc-200 rounded-md px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-zinc-400 transition-colors bg-zinc-50"
                  placeholder="you@example.com"
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
                {pending ? 'Sending…' : 'Send Reset Link'}
              </button>

              <p className="text-center text-xs text-zinc-400">
                <Link href="/login" className="hover:text-zinc-700 transition-colors underline underline-offset-2">
                  Back to sign in
                </Link>
              </p>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-zinc-300 mt-8 tracking-wider">
          &copy; 2026 Altrera Industries
        </p>
      </div>
    </div>
  )
}

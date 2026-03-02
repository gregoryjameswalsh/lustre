'use client'

// src/app/login/page.tsx
// Login form — uses a server action so auth goes through our server,
// allowing rate limiting and keeping credentials off the client-side bundle.

import { useActionState } from 'react'
import { signIn } from '@/lib/actions/auth'

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, {})

  return (
    <div className="min-h-screen bg-[#f9f8f5] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-10">
          <span className="text-xs font-medium tracking-[0.25em] uppercase text-zinc-800">
            Lustre
          </span>
          <p className="text-xs tracking-widest uppercase text-zinc-400 mt-1">
            Operator Portal
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-zinc-200 rounded-lg p-8">
          <h1 className="text-xl font-light tracking-tight text-zinc-900 mb-1">
            Welcome back
          </h1>
          <p className="text-sm text-zinc-400 mb-8">
            Sign in to your account
          </p>

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
                className="w-full border border-zinc-200 rounded-md px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-zinc-400 transition-colors bg-zinc-50"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium tracking-wider uppercase text-zinc-500 mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                className="w-full border border-zinc-200 rounded-md px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-zinc-400 transition-colors bg-zinc-50"
                placeholder="••••••••"
              />
            </div>

            {state?.error && (
              <p className="text-xs text-red-500 tracking-wide">{state.error}</p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full bg-zinc-900 text-[#f9f8f5] text-xs font-medium tracking-[0.15em] uppercase py-3.5 rounded-full hover:bg-[#4a5c4e] transition-colors disabled:opacity-50"
            >
              {pending ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-zinc-300 mt-8 tracking-wider">
          (c) 2026 Altrera Industries
        </p>
      </div>
    </div>
  )
}

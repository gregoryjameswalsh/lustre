// src/app/suspended/page.tsx
// Shown to users whose account has been suspended by an admin.
// Accessible without an active session so the user isn't stuck in a redirect loop.

export default function SuspendedPage() {
  return (
    <div className="min-h-screen bg-[#f9f8f5] flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">

        <div className="mb-10">
          <span className="text-xs font-medium tracking-[0.25em] uppercase text-zinc-800">
            Lustre
          </span>
          <p className="text-xs tracking-widest uppercase text-zinc-400 mt-1">
            Operator Portal
          </p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-lg p-8">
          <h1 className="text-xl font-light tracking-tight text-zinc-900 mb-3">
            Account suspended
          </h1>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Your access to this organisation has been suspended by an administrator.
            Please contact your admin if you believe this is an error.
          </p>
        </div>

        <p className="text-center text-xs text-zinc-300 mt-8 tracking-wider">
          &copy; 2026 Altrera Industries
        </p>
      </div>
    </div>
  )
}

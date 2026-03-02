import { getClients } from '@/lib/queries/clients'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Client } from '@/lib/types'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const clients = await getClients()

  const statusColour: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-600',
    lead:   'bg-amber-50 text-amber-600',
    inactive: 'bg-zinc-100 text-zinc-400',
  }

  return (
    <div className="min-h-screen bg-[#f9f8f5]">

      <main className="max-w-7xl mx-auto px-4 pt-8 pb-4 sm:px-6 md:pt-24 md:pb-16">

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6 md:mb-8">
          <div>
            <p className="text-xs font-medium tracking-[0.3em] uppercase text-[#4a5c4e] mb-2">
              CRM
            </p>
            <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-zinc-900">
              Clients
              <span className="text-zinc-300 ml-3 text-xl sm:text-2xl">{clients.length}</span>
            </h1>
          </div>
          <a
            href="/dashboard/clients/new"
            className="self-start sm:self-auto text-xs font-medium tracking-[0.15em] uppercase bg-zinc-900 text-[#f9f8f5] px-5 py-3 rounded-full hover:bg-[#4a5c4e] transition-colors"
          >
            + Add Client
          </a>
        </div>

        {/* Table */}
        {clients.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-lg px-8 py-16 text-center">
            <p className="text-sm text-zinc-300 tracking-wide mb-3">No clients yet</p>
            <a href="/dashboard/clients/new" className="text-xs text-[#4a5c4e] hover:underline">
              Add your first client →
            </a>
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
            {/* Table header — tablet+ only */}
            <div className="hidden sm:grid grid-cols-[1fr_1fr_120px_80px] gap-4 px-6 py-3 border-b border-zinc-100 bg-zinc-50">
              <span className="text-xs font-medium tracking-[0.15em] uppercase text-zinc-400">Name</span>
              <span className="text-xs font-medium tracking-[0.15em] uppercase text-zinc-400">Email</span>
              <span className="text-xs font-medium tracking-[0.15em] uppercase text-zinc-400">Status</span>
              <span></span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-zinc-50">
              {clients.map((client: Client) => (
                <a
                  key={client.id}
                  href={`/dashboard/clients/${client.id}`}
                  className="block hover:bg-zinc-50 transition-colors"
                >
                  {/* Mobile card */}
                  <div className="sm:hidden flex items-center justify-between px-4 py-4 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-medium text-zinc-600 flex-shrink-0">
                        {client.first_name[0]}{client.last_name[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-900 truncate">
                          {client.first_name} {client.last_name}
                        </p>
                        <p className="text-xs text-zinc-400 mt-0.5 truncate">{client.email ?? '—'}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium tracking-wide flex-shrink-0 ${statusColour[client.status]}`}>
                      {client.status}
                    </span>
                  </div>
                  {/* Desktop row */}
                  <div className="hidden sm:grid grid-cols-[1fr_1fr_120px_80px] gap-4 px-6 py-4 items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-medium text-zinc-600 flex-shrink-0">
                        {client.first_name[0]}{client.last_name[0]}
                      </div>
                      <span className="text-sm font-medium text-zinc-900">
                        {client.first_name} {client.last_name}
                      </span>
                    </div>
                    <span className="text-sm text-zinc-500 truncate">{client.email ?? '—'}</span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium tracking-wide inline-flex w-fit ${statusColour[client.status]}`}>
                      {client.status}
                    </span>
                    <span className="text-xs text-zinc-300 text-right">View →</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
// Static preview used as the blurred content inside the Clients & Team UpgradeGate.

const mockClients = [
  { name: 'Sarah Mitchell', revenue: '£4,200', jobs: 18, risk: false },
  { name: 'James Thornton', revenue: '£3,100', jobs: 12, risk: false },
  { name: 'Claire Osei', revenue: '£2,800', jobs: 9, risk: true },
  { name: 'Robert Hughes', revenue: '£1,950', jobs: 7, risk: false },
  { name: 'Priya Sharma', revenue: '£1,400', jobs: 5, risk: true },
]

const mockTeam = [
  { name: 'D. Clarke', jobs: 24, revenue: '£5,800' },
  { name: 'A. Patel', jobs: 18, revenue: '£4,100' },
  { name: "M. O'Brien", jobs: 15, revenue: '£3,200' },
]

export default function LockedClientsPreview() {
  return (
    <div className="bg-white p-6 space-y-6">
      <div>
        <h2 className="text-sm font-medium text-zinc-900 mb-4">Client Lifetime Value</h2>
        <div className="divide-y divide-zinc-50 border border-zinc-100 rounded-lg overflow-hidden">
          {mockClients.map(c => (
            <div key={c.name} className="flex items-center gap-4 px-4 py-3">
              <div className="w-7 h-7 rounded-full bg-[#C8F5D7] flex items-center justify-center text-[10px] font-medium text-[#1A3329] flex-shrink-0">
                {c.name.split(' ').map(n => n[0]).join('')}
              </div>
              <span className="text-xs text-zinc-700 flex-1">{c.name}</span>
              {c.risk && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">
                  At risk
                </span>
              )}
              <span className="text-xs font-medium text-zinc-900">{c.revenue}</span>
              <span className="text-xs text-zinc-400">{c.jobs} jobs</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h2 className="text-sm font-medium text-zinc-900 mb-4">Team Performance</h2>
        <div className="divide-y divide-zinc-50 border border-zinc-100 rounded-lg overflow-hidden">
          {mockTeam.map(m => (
            <div key={m.name} className="flex items-center gap-4 px-4 py-3">
              <span className="text-xs text-zinc-700 flex-1">{m.name}</span>
              <span className="text-xs text-zinc-400">{m.jobs} jobs</span>
              <span className="text-xs font-medium text-zinc-900">{m.revenue}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

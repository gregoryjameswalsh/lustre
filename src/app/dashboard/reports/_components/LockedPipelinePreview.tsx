// Static preview used as the blurred content inside the Pipeline UpgradeGate.
// Numbers are illustrative — they convey what the feature looks like without
// exposing any real org data.

export default function LockedPipelinePreview() {
  const stages = [
    { label: 'Sent', count: 14, value: 8400, pct: 100 },
    { label: 'Viewed', count: 9, value: 5200, pct: 62 },
    { label: 'Accepted', count: 5, value: 2900, pct: 35 },
  ]

  const metrics = [
    { label: 'Pipeline Value', value: '£8,400' },
    { label: 'Weighted Pipeline', value: '£2,940' },
    { label: 'Avg Days to Close', value: '4.2' },
    { label: 'Quotes at Risk', value: '3' },
  ]

  return (
    <div className="bg-white p-6 space-y-6">
      <div>
        <h2 className="text-sm font-medium text-zinc-900 mb-4">Quote Pipeline</h2>
        <div className="flex gap-3">
          {stages.map(s => (
            <div key={s.label} className="flex-1 bg-zinc-50 rounded-lg p-4">
              <p className="text-xs font-medium tracking-[0.15em] uppercase text-zinc-400 mb-2">{s.label}</p>
              <p className="text-2xl font-light text-zinc-900">{s.count}</p>
              <p className="text-xs text-zinc-400 mt-1">£{s.value.toLocaleString()}</p>
              <div className="mt-2 h-1 bg-zinc-200 rounded-full">
                <div className="h-full bg-[#3D7A5F] rounded-full" style={{ width: `${s.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map(m => (
          <div key={m.label} className="bg-zinc-50 rounded-lg px-4 py-4">
            <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-zinc-400 mb-1">{m.label}</p>
            <p className="text-xl font-light text-zinc-900">{m.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

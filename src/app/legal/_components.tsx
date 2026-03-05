// src/app/legal/_components.tsx
// Shared presentational components for /legal/* pages.

export function LegalPage({
  title,
  effectiveDate,
  children,
}: {
  title: string
  effectiveDate: string
  children: React.ReactNode
}) {
  return (
    <article>
      <header className="mb-10 pb-8 border-b border-zinc-200">
        <h1 className="text-2xl font-light tracking-tight text-zinc-900 mb-2">
          {title}
        </h1>
        <p className="text-xs text-zinc-400 tracking-wider uppercase">
          Effective {effectiveDate}
        </p>
      </header>
      <div className="space-y-10">{children}</div>
    </article>
  )
}

export function Section({
  heading,
  children,
}: {
  heading: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="text-sm font-medium tracking-wider uppercase text-zinc-500 mb-3">
        {heading}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

export function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-zinc-600 leading-relaxed">{children}</p>
  )
}

export function Ul({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 ml-4">
      {items.map((item) => (
        <li key={item} className="text-sm text-zinc-600 leading-relaxed flex gap-2">
          <span className="text-zinc-300 shrink-0 mt-0.5">—</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

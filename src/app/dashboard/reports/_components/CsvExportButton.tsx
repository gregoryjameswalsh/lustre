'use client'

import { Download } from 'lucide-react'

type CsvRow = Record<string, string | number | null>

interface Props {
  data: CsvRow[]
  filename: string
  label?: string
  disabled?: boolean
}

function toCsv(data: CsvRow[]): string {
  if (data.length === 0) return ''
  const headers = Object.keys(data[0])
  const rows = data.map(row =>
    headers.map(h => {
      const val = row[h]
      if (val === null || val === undefined) return ''
      const str = String(val)
      // Quote fields containing commas, quotes, or newlines
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str
    }).join(',')
  )
  return [headers.join(','), ...rows].join('\r\n')
}

export default function CsvExportButton({ data, filename, label = 'Export CSV', disabled }: Props) {
  function handleExport() {
    if (data.length === 0 || disabled) return
    const csv = toCsv(data)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleExport}
      disabled={disabled || data.length === 0}
      className="inline-flex items-center gap-1.5 text-xs font-medium tracking-wide border border-zinc-200 text-zinc-500 px-3 py-1.5 rounded-lg hover:border-zinc-400 hover:text-zinc-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <Download className="w-3 h-3" />
      {label}
    </button>
  )
}

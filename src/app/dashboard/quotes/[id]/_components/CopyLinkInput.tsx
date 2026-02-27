'use client'

export default function CopyLinkInput({ url }: { url: string }) {
  return (
    <input
      readOnly
      value={url}
      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-500 outline-none cursor-pointer"
      onFocus={e => e.target.select()}
      onClick={e => (e.target as HTMLInputElement).select()}
    />
  )
}
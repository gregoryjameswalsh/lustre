// src/app/legal/page.tsx
// /legal index — redirect to Terms of Service as the canonical entry point.

import { redirect } from 'next/navigation'

export default function LegalIndexPage() {
  redirect('/legal/terms')
}

'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Nav from '@/components/dashboard/Nav'

export default function NewPropertyPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organisation_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organisation_id) {
      setError('No organisation found.')
      setLoading(false)
      return
    }

    const { error } = await supabase.from('properties').insert({
      organisation_id: profile.organisation_id,
      client_id: clientId,
      address_line1: formData.get('address_line1') as string,
      address_line2: formData.get('address_line2') || null,
      town: formData.get('town') || null,
      postcode: formData.get('postcode') || null,
      property_type: formData.get('property_type') || null,
      bedrooms: formData.get('bedrooms') ? Number(formData.get('bedrooms')) : null,
      bathrooms: formData.get('bathrooms') ? Number(formData.get('bathrooms')) : null,
      access_instructions: formData.get('access_instructions') || null,
      parking_instructions: formData.get('parking_instructions') || null,
      alarm_instructions: formData.get('alarm_instructions') || null,
      key_held: formData.get('key_held') === 'true',
      specialist_surfaces: formData.get('specialist_surfaces') || null,
      pets: formData.get('pets') || null,
    })

    if (error) {
      setError("Something went wrong. Please try again.")
      setLoading(false)
    } else {
      router.push(`/dashboard/clients/${clientId}`)
      router.refresh()
    }
  }

  const inputClass = "w-full border border-zinc-200 rounded-md px-4 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-zinc-400 bg-zinc-50 transition-colors"
  const labelClass = "block text-xs font-medium tracking-wider uppercase text-zinc-500 mb-2"

  return (
    <div className="min-h-screen bg-[#f9f8f5]">
      <Nav />

      <main className="max-w-3xl mx-auto px-6 pt-24 pb-16">

        <div className="mb-8">
          <a href={`/dashboard/clients/${clientId}`} className="text-xs text-zinc-400 hover:text-zinc-900 transition-colors tracking-wide">
            ← Back to Client
          </a>
          <h1 className="text-3xl font-light tracking-tight text-zinc-900 mt-4">Add Property</h1>
          <p className="text-sm text-zinc-400 mt-1">All the detail a cleaner needs to do their best work.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Address */}
          <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100">
              <h2 className="text-sm font-medium text-zinc-900 tracking-tight">Address</h2>
            </div>
            <div className="px-6 py-6 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelClass}>
                  Address Line 1 <span className="text-red-400">*</span>
                </label>
                <input name="address_line1" required className={inputClass} placeholder="12 High Street" />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Address Line 2</label>
                <input name="address_line2" className={inputClass} placeholder="Apartment, suite, etc." />
              </div>
              <div>
                <label className={labelClass}>Town / Village</label>
                <input name="town" className={inputClass} placeholder="Tetbury" />
              </div>
              <div>
                <label className={labelClass}>Postcode</label>
                <input name="postcode" className={inputClass} placeholder="GL8 8AA" />
              </div>
            </div>
          </div>

          {/* Property details */}
          <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100">
              <h2 className="text-sm font-medium text-zinc-900 tracking-tight">Property Details</h2>
            </div>
            <div className="px-6 py-6 grid grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Type</label>
                <select name="property_type" className={inputClass}>
                  <option value="">— Select —</option>
                  <option value="house">House</option>
                  <option value="flat">Flat</option>
                  <option value="barn">Barn</option>
                  <option value="cottage">Cottage</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Bedrooms</label>
                <input name="bedrooms" type="number" min="0" max="20" className={inputClass} placeholder="4" />
              </div>
              <div>
                <label className={labelClass}>Bathrooms</label>
                <input name="bathrooms" type="number" min="0" max="20" className={inputClass} placeholder="2" />
              </div>
              <div className="col-span-3">
                <label className={labelClass}>Specialist Surfaces</label>
                <input
                  name="specialist_surfaces"
                  className={inputClass}
                  placeholder="e.g. Limestone floors, marble worktops, hardwood throughout"
                />
              </div>
              <div className="col-span-3">
                <label className={labelClass}>Pets</label>
                <input
                  name="pets"
                  className={inputClass}
                  placeholder="e.g. Two Labradors, cat"
                />
              </div>
            </div>
          </div>

          {/* Access */}
          <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100">
              <h2 className="text-sm font-medium text-zinc-900 tracking-tight">Access & Entry</h2>
            </div>
            <div className="px-6 py-6 space-y-4">

              {/* Key held toggle */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-zinc-900">Key held by us</p>
                  <p className="text-xs text-zinc-400 mt-0.5">We hold a key for this property</p>
                </div>
                <div className="flex gap-3">
                  {[{label: 'Yes', value: 'true'}, {label: 'No', value: 'false'}].map(opt => (
                    <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="key_held"
                        value={opt.value}
                        defaultChecked={opt.value === 'false'}
                        className="accent-[#4a5c4e]"
                      />
                      <span className="text-sm text-zinc-600">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>Access Instructions</label>
                <textarea
                  name="access_instructions"
                  rows={3}
                  className={`${inputClass} resize-none`}
                  placeholder="e.g. Key under the stone by the back gate, enter through side door"
                />
              </div>
              <div>
                <label className={labelClass}>Alarm Instructions</label>
                <textarea
                  name="alarm_instructions"
                  rows={2}
                  className={`${inputClass} resize-none`}
                  placeholder="e.g. Code is 1234, press away then enter. Re-arm on exit."
                />
              </div>
              <div>
                <label className={labelClass}>Parking Instructions</label>
                <textarea
                  name="parking_instructions"
                  rows={2}
                  className={`${inputClass} resize-none`}
                  placeholder="e.g. Park on the driveway, or in the lay-by on the lane"
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500 tracking-wide">{error}</p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="text-xs font-medium tracking-[0.15em] uppercase bg-zinc-900 text-[#f9f8f5] px-6 py-3 rounded-full hover:bg-[#4a5c4e] transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Save Property'}
            </button>
            <a
              href={`/dashboard/clients/${clientId}`}
              className="text-xs font-medium tracking-[0.15em] uppercase border border-zinc-200 text-zinc-500 px-6 py-3 rounded-full hover:border-zinc-400 transition-colors"
            >
              Cancel
            </a>
          </div>

        </form>
      </main>
    </div>
  )
}
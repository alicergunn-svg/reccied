'use client'
import { useState } from 'react'
import type { Place, ExtractedPlace } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

interface Props {
  userId: string
  token: string
  onClose: () => void
  onAdded: (place: Place) => void
  tripId?: string // if adding straight to a trip
}

export default function AddPlaceModal({ userId, onClose, onAdded, tripId }: Props) {
  const [url, setUrl] = useState('')
  const [step, setStep] = useState<'url' | 'review' | 'saving'>('url')
  const [extracting, setExtracting] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<ExtractedPlace | null>(null)
  const [notes, setNotes] = useState('')

  async function extract() {
    if (!url.trim()) return
    setExtracting(true)
    setError('')
    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const json = await res.json()
      if (!res.ok || !json.data) throw new Error(json.error || 'Extraction failed')
      setData(json.data)
      setStep('review')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setExtracting(false)
    }
  }

  async function save() {
    if (!data) return
    setStep('saving')
    const { data: { session } } = await supabase.auth.getSession()

    const payload = {
      user_id: userId,
      url,
      ...data,
      notes,
      is_public: true,
    }

    const { data: saved, error: err } = await supabase
      .from('places')
      .insert(payload)
      .select()
      .single()

    if (err || !saved) {
      setError(err?.message || 'Save failed')
      setStep('review')
      return
    }

    // If adding to a trip, link it
    if (tripId && session) {
      await supabase.from('trip_places').insert({ trip_id: tripId, place_id: saved.id, added_by: userId })
    }

    onAdded(saved as Place)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-stone-100">
          <h2 className="font-semibold text-lg">Add a place</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 text-xl">✕</button>
        </div>

        <div className="p-5">
          {step === 'url' && (
            <>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Paste the listing URL</label>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && extract()}
                placeholder="https://www.airbnb.co.uk/rooms/…"
                className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 mb-3"
                autoFocus
              />
              {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
              <button
                onClick={extract}
                disabled={extracting || !url}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50"
              >
                {extracting ? 'Extracting info…' : 'Look it up →'}
              </button>
              <p className="text-xs text-stone-400 mt-2 text-center">Claude will read the page and fill in the details</p>
            </>
          )}

          {(step === 'review' || step === 'saving') && data && (
            <>
              {/* Image strip */}
              {data.images?.length > 0 && (
                <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                  {data.images.slice(0, 4).map((img, i) => (
                    <div key={i} className="relative w-28 h-20 shrink-0 rounded-lg overflow-hidden bg-stone-100">
                      <Image src={img} alt="" fill className="object-cover" unoptimized />
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3">
                <Field label="Name" value={data.name} onChange={v => setData({ ...data, name: v })} />
                <Field label="Location" value={data.location} onChange={v => setData({ ...data, location: v })} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="£ per night" value={String(data.cost_per_night ?? '')} onChange={v => setData({ ...data, cost_per_night: v ? Number(v) : null })} type="number" />
                  <Field label="Sleeps" value={String(data.sleeps ?? '')} onChange={v => setData({ ...data, sleeps: v ? Number(v) : null })} type="number" />
                </div>
                <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.dog_friendly ?? false}
                    onChange={e => setData({ ...data, dog_friendly: e.target.checked })}
                    className="accent-brand-600"
                  />
                  Dog friendly
                </label>
                {data.best_bits?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-stone-500 mb-1">Best bits (auto-detected)</p>
                    <ul className="space-y-0.5">
                      {data.best_bits.map((b, i) => (
                        <li key={i} className="text-sm text-stone-600 flex gap-1.5">
                          <span className="text-brand-500">✦</span>{b}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">Your notes (optional)</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Why I love it, best time to visit…"
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                </div>
              </div>

              {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

              <div className="flex gap-2 mt-5">
                <button onClick={() => setStep('url')} className="flex-1 border border-stone-200 text-stone-600 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-50 transition">
                  ← Back
                </button>
                <button
                  onClick={save}
                  disabled={step === 'saving'}
                  className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50"
                >
                  {step === 'saving' ? 'Saving…' : 'Save to Reccie'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
      />
    </div>
  )
}

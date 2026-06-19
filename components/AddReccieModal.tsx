'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profile, Reccie, ExtractedPlace } from '@/lib/types'
import Image from 'next/image'

interface Props {
  userId: string
  profile: Profile
  onClose: () => void
  onAdded: (r: Reccie) => void
}

type Step = 'url' | 'type' | 'facts' | 'story' | 'saving'

export default function AddReccieModal({ userId, profile, onClose, onAdded }: Props) {
  const [step, setStep] = useState<Step>('url')
  const [url, setUrl] = useState('')
  const [type, setType] = useState<'reccie' | 'save'>('reccie')
  const [extracting, setExtracting] = useState(false)
  const [place, setPlace] = useState<ExtractedPlace | null>(null)
  const [error, setError] = useState('')

  // Story prompts
  const [whatMadeItSpecial, setWhatMadeItSpecial] = useState('')
  const [whoWouldLoveIt, setWhoWouldLoveIt] = useState('')
  const [bestTip, setBestTip] = useState('')
  const [whatToDoNearby, setWhatToDoNearby] = useState('')
  const [saveNote, setSaveNote] = useState('')

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
      if (!json.data) throw new Error(json.error ?? 'Extraction failed')
      setPlace(json.data)
      setStep('type')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setExtracting(false)
    }
  }

  async function save() {
    if (!place) return
    setStep('saving')

    // Upsert place (deduplicate by URL)
    const urlHash = url.trim().toLowerCase().replace(/\/$/, '')
    const { data: existingPlace } = await supabase
      .from('places')
      .select('id')
      .eq('url_hash', urlHash)
      .single()

    let placeId: string
    if (existingPlace) {
      placeId = existingPlace.id
    } else {
      const { data: newPlace, error: placeErr } = await supabase
        .from('places')
        .insert({ ...place, url, url_hash: urlHash })
        .select('id')
        .single()
      if (placeErr || !newPlace) { setError(placeErr?.message ?? 'Failed to save place'); setStep('story'); return }
      placeId = newPlace.id
    }

    // Create reccie
    const payload = {
      user_id: userId,
      place_id: placeId,
      type,
      what_made_it_special: type === 'reccie' ? (whatMadeItSpecial || null) : null,
      who_would_love_it: type === 'reccie' ? (whoWouldLoveIt || null) : null,
      best_tip: type === 'reccie' ? (bestTip || null) : null,
      what_to_do_nearby: type === 'reccie' ? (whatToDoNearby || null) : null,
      save_note: type === 'save' ? (saveNote || null) : null,
      is_public: true,
    }

    const { data: saved, error: rErr } = await supabase
      .from('reccies')
      .insert(payload)
      .select('*, place:places(*), profile:profiles(*)')
      .single()

    if (rErr || !saved) {
      setError(rErr?.message ?? 'Could not save reccie')
      setStep('story')
      return
    }

    onAdded(saved as Reccie)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-stone-100">
          <div>
            <h2 className="font-semibold text-lg">
              {step === 'url' && 'Add a place'}
              {step === 'type' && 'Have you stayed here?'}
              {step === 'facts' && 'Check the details'}
              {step === 'story' && (type === 'reccie' ? 'Tell the story' : 'Add a note')}
              {step === 'saving' && 'Saving…'}
            </h2>
            {step !== 'url' && step !== 'saving' && (
              <p className="text-sm text-stone-400 truncate max-w-xs">{place?.name}</p>
            )}
          </div>
          <button onClick={onClose} className="text-stone-300 hover:text-stone-600 text-2xl leading-none">✕</button>
        </div>

        <div className="px-6 py-5">

          {/* Step 1: URL */}
          {step === 'url' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1.5">Paste the listing URL</label>
                <input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && extract()}
                  placeholder="https://www.airbnb.co.uk/rooms/…"
                  className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-forest-300"
                  autoFocus
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                onClick={extract}
                disabled={extracting || !url.trim()}
                className="w-full bg-forest-600 hover:bg-forest-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
              >
                {extracting ? 'Looking it up…' : 'Look it up →'}
              </button>
              <p className="text-xs text-stone-400 text-center">Claude reads the page and fills in the details</p>
            </div>
          )}

          {/* Step 2: Reccie or Save? */}
          {step === 'type' && place && (
            <div className="space-y-4">
              {place.images?.[0] && (
                <div className="relative h-40 rounded-xl overflow-hidden bg-stone-100">
                  <Image src={place.images[0]} alt={place.name} fill className="object-cover" unoptimized />
                </div>
              )}
              <p className="text-sm text-stone-500">📍 {place.location}</p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { setType('reccie'); setStep('facts') }}
                  className="border-2 border-forest-600 rounded-xl p-4 text-left hover:bg-forest-50 transition"
                >
                  <div className="text-2xl mb-1">✦</div>
                  <div className="font-semibold text-forest-700">Reccie it</div>
                  <div className="text-xs text-stone-400 mt-0.5">I've stayed here and I recommend it</div>
                </button>
                <button
                  onClick={() => { setType('save'); setStep('facts') }}
                  className="border-2 border-stone-200 rounded-xl p-4 text-left hover:bg-stone-50 transition"
                >
                  <div className="text-2xl mb-1">🔖</div>
                  <div className="font-semibold text-stone-700">Save it</div>
                  <div className="text-xs text-stone-400 mt-0.5">I want to stay here someday</div>
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Check facts */}
          {step === 'facts' && place && (
            <div className="space-y-3">
              <p className="text-sm text-stone-400">Claude filled these in — correct anything that looks wrong.</p>

              {place.images?.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {place.images.slice(0, 4).map((img, i) => (
                    <div key={i} className="relative w-24 h-16 rounded-lg overflow-hidden shrink-0 bg-stone-100">
                      <Image src={img} alt="" fill className="object-cover" unoptimized />
                    </div>
                  ))}
                </div>
              )}

              <Field label="Name" value={place.name} onChange={v => setPlace({ ...place, name: v })} />
              <Field label="Location" value={place.location} onChange={v => setPlace({ ...place, location: v })} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="£ per night" value={String(place.cost_per_night ?? '')} onChange={v => setPlace({ ...place, cost_per_night: v ? Number(v) : null })} type="number" />
                <Field label="Sleeps" value={String(place.sleeps ?? '')} onChange={v => setPlace({ ...place, sleeps: v ? Number(v) : null })} type="number" />
              </div>
              <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
                <input type="checkbox" checked={place.dog_friendly ?? false} onChange={e => setPlace({ ...place, dog_friendly: e.target.checked })} className="accent-forest-600" />
                Dog friendly
              </label>

              <div className="flex gap-2 pt-2">
                <button onClick={() => setStep('type')} className="flex-1 border border-stone-200 text-stone-600 py-2.5 rounded-xl text-sm hover:bg-stone-50 transition">← Back</button>
                <button onClick={() => setStep('story')} className="flex-1 bg-forest-600 hover:bg-forest-700 text-white font-semibold py-2.5 rounded-xl transition">
                  {type === 'reccie' ? 'Add your story →' : 'Add a note →'}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Story prompts */}
          {step === 'story' && (
            <div className="space-y-4">
              {type === 'reccie' ? (
                <>
                  <p className="text-sm text-stone-400">These answers are what make a reccie worth reading. Be honest and specific.</p>
                  <Prompt label="What made it special?" value={whatMadeItSpecial} onChange={setWhatMadeItSpecial} placeholder="The view from the hot tub at midnight. The complete silence. Waking up to deer in the garden." />
                  <Prompt label="Who would love it?" value={whoWouldLoveIt} onChange={setWhoWouldLoveIt} placeholder="Couples wanting to switch off. Not great for young kids — the track is rough." />
                  <Prompt label="Best tip?" value={bestTip} onChange={setBestTip} placeholder="Book the pizza oven slot in advance. Bring more wine than you think you need." />
                  <Prompt label="What would you do nearby?" value={whatToDoNearby} onChange={setWhatToDoNearby} placeholder="The coastal path to St Ives takes about 2 hours and is stunning." optional />
                </>
              ) : (
                <Prompt label="Why did it catch your eye?" value={saveNote} onChange={setSaveNote} placeholder="Looks incredible for a group trip. The outdoor space is unlike anything I've seen." optional />
              )}

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <div className="flex gap-2 pt-2">
                <button onClick={() => setStep('facts')} className="flex-1 border border-stone-200 text-stone-600 py-2.5 rounded-xl text-sm hover:bg-stone-50 transition">← Back</button>
                <button
                  onClick={save}
                  className="flex-1 bg-forest-600 hover:bg-forest-700 text-white font-semibold py-2.5 rounded-xl transition"
                >
                  Publish {type === 'reccie' ? 'reccie' : 'save'}
                </button>
              </div>
            </div>
          )}

          {step === 'saving' && (
            <div className="text-center py-8 text-stone-400">Saving your reccie…</div>
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
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-300" />
    </div>
  )
}

function Prompt({ label, value, onChange, placeholder, optional }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; optional?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-700 mb-1">
        {label} {optional && <span className="text-stone-400 font-normal">(optional)</span>}
      </label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-300 resize-none placeholder:text-stone-300"
      />
    </div>
  )
}

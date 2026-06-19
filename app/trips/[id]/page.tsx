'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { Place, Trip } from '@/lib/types'
import PlaceCard from '@/components/PlaceCard'
import AddPlaceModal from '@/components/AddPlaceModal'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface TripPlaceWithData {
  id: string
  place_id: string
  added_by: string
  place: Place
  voteCount: number
  userVoted: boolean
}

export default function TripPage() {
  const { id } = useParams<{ id: string }>()
  const [user, setUser] = useState<User | null>(null)
  const [trip, setTrip] = useState<Trip | null>(null)
  const [items, setItems] = useState<TripPlaceWithData[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) load(session.user.id)
      else setLoading(false)
    })
  }, [id])

  async function load(userId: string) {
    setLoading(true)
    const { data: tripData } = await supabase.from('trips').select('*').eq('id', id).single()
    setTrip(tripData)

    const { data: tpData } = await supabase
      .from('trip_places')
      .select('*, place:places(*)')
      .eq('trip_id', id)

    if (!tpData) { setLoading(false); return }

    const { data: votesData } = await supabase
      .from('votes')
      .select('trip_place_id, user_id')
      .in('trip_place_id', tpData.map(tp => tp.id))

    const enriched: TripPlaceWithData[] = tpData.map(tp => ({
      id: tp.id,
      place_id: tp.place_id,
      added_by: tp.added_by,
      place: tp.place as Place,
      voteCount: votesData?.filter(v => v.trip_place_id === tp.id).length ?? 0,
      userVoted: !!votesData?.find(v => v.trip_place_id === tp.id && v.user_id === userId),
    }))

    // Sort by votes descending
    enriched.sort((a, b) => b.voteCount - a.voteCount)
    setItems(enriched)
    setLoading(false)
  }

  async function toggleVote(item: TripPlaceWithData) {
    if (!user) return
    if (item.userVoted) {
      await supabase.from('votes').delete().eq('trip_place_id', item.id).eq('user_id', user.id)
    } else {
      await supabase.from('votes').insert({ trip_place_id: item.id, user_id: user.id })
    }
    load(user.id)
  }

  function copyInvite() {
    navigator.clipboard.writeText(trip?.invite_code ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Please <Link href="/" className="text-brand-600 underline">sign in</Link> first.</p>
    </div>
  )

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/trips" className="text-stone-400 hover:text-stone-700 text-sm">← Trips</Link>
            <h1 className="text-xl font-bold text-brand-700">{trip?.name ?? 'Trip'}</h1>
          </div>
          <div className="flex gap-2">
            {trip?.invite_code && (
              <button onClick={copyInvite} className="border border-stone-200 text-stone-600 text-xs font-mono px-3 py-1.5 rounded-lg hover:bg-stone-50 transition">
                {copied ? '✅ Copied!' : `Code: ${trip.invite_code}`}
              </button>
            )}
            <button onClick={() => setShowAdd(true)} className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition">
              + Add place
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {trip && (
          <div className="bg-brand-50 rounded-2xl p-4 mb-6 flex flex-wrap gap-4 text-sm text-stone-600">
            {trip.description && <span>{trip.description}</span>}
            {trip.date_from && <span>📅 {trip.date_from}{trip.date_to ? ` → ${trip.date_to}` : ''}</span>}
            {trip.budget_per_night && <span>💰 Budget: £{trip.budget_per_night}/night</span>}
            <span className="text-stone-400">Share code <strong className="font-mono text-stone-700">{trip.invite_code}</strong> to invite friends</span>
          </div>
        )}

        {loading ? (
          <p className="text-stone-400 text-center py-12">Loading…</p>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-stone-400 mb-4">No places added yet. Be the first!</p>
            <button onClick={() => setShowAdd(true)} className="bg-brand-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-brand-700">
              + Add a place
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item, idx) => (
              <div key={item.id} className="flex gap-4 items-start">
                {/* Rank badge */}
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mt-2 ${idx === 0 ? 'bg-yellow-400 text-yellow-900' : idx === 1 ? 'bg-stone-300 text-stone-700' : 'bg-stone-100 text-stone-500'}`}>
                  {idx + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <PlaceCard place={item.place} userId={user.id} compact />
                </div>

                {/* Vote button */}
                <button
                  onClick={() => toggleVote(item)}
                  className={`shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border transition mt-2 ${item.userVoted ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-stone-200 text-stone-600 hover:border-brand-400'}`}
                >
                  <span className="text-lg leading-none">{item.userVoted ? '♥' : '♡'}</span>
                  <span className="text-xs font-semibold">{item.voteCount}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {showAdd && (
        <AddPlaceModal
          userId={user.id}
          token=""
          onClose={() => setShowAdd(false)}
          onAdded={() => { setShowAdd(false); load(user.id) }}
          tripId={id}
        />
      )}
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { Trip } from '@/lib/types'
import Link from 'next/link'

export default function TripsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')

  // Create trip form
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [budget, setBudget] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) loadTrips()
      else setLoading(false)
    })
  }, [])

  async function loadTrips() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    // Get trips user is a member of
    const { data: memberships } = await supabase
      .from('trip_members')
      .select('trip_id')
      .eq('user_id', session.user.id)

    if (!memberships?.length) { setLoading(false); return }

    const tripIds = memberships.map(m => m.trip_id)
    const { data } = await supabase.from('trips').select('*').in('id', tripIds).order('created_at', { ascending: false })
    setTrips(data ?? [])
    setLoading(false)
  }

  async function createTrip() {
    if (!name || !user) return
    setCreating(true)
    const { data, error } = await supabase.from('trips').insert({
      name, description, date_from: dateFrom || null, date_to: dateTo || null,
      budget_per_night: budget ? Number(budget) : null, owner_id: user.id,
    }).select().single()

    if (!error && data) {
      await supabase.from('trip_members').insert({ trip_id: data.id, user_id: user.id, role: 'owner' })
      setTrips(prev => [data, ...prev])
      setShowCreate(false)
      setName(''); setDescription(''); setDateFrom(''); setDateTo(''); setBudget('')
    }
    setCreating(false)
  }

  async function joinTrip() {
    if (!joinCode || !user) return
    setJoining(true)
    setJoinError('')
    const { data: trip } = await supabase.from('trips').select('*').eq('invite_code', joinCode.trim()).single()
    if (!trip) { setJoinError('Trip not found — check the code'); setJoining(false); return }
    const { error } = await supabase.from('trip_members').insert({ trip_id: trip.id, user_id: user.id, role: 'member' })
    if (error && error.code !== '23505') { setJoinError('Could not join trip'); setJoining(false); return }
    setTrips(prev => prev.find(t => t.id === trip.id) ? prev : [trip, ...prev])
    setShowJoin(false); setJoinCode('')
    setJoining(false)
  }

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-stone-500">Please <Link href="/" className="text-brand-600 underline">sign in</Link> first.</p>
    </div>
  )

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-stone-400 hover:text-stone-700 text-sm">← Home</Link>
            <h1 className="text-xl font-bold text-brand-700">Trips</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowJoin(true)} className="border border-brand-600 text-brand-600 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-brand-50 transition">
              Join trip
            </button>
            <button onClick={() => setShowCreate(true)} className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition">
              + New trip
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {loading ? (
          <p className="text-stone-400 text-center py-16">Loading…</p>
        ) : trips.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-stone-400 mb-4">No trips yet. Create one and invite friends!</p>
            <button onClick={() => setShowCreate(true)} className="bg-brand-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-brand-700 transition">
              + Create a trip
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {trips.map(trip => (
              <Link key={trip.id} href={`/trips/${trip.id}`}>
                <div className="bg-white border border-stone-100 rounded-2xl p-5 hover:shadow-md transition cursor-pointer">
                  <h3 className="font-semibold text-lg mb-1">{trip.name}</h3>
                  {trip.description && <p className="text-stone-500 text-sm mb-3">{trip.description}</p>}
                  <div className="flex flex-wrap gap-3 text-sm text-stone-500">
                    {trip.date_from && <span>📅 {trip.date_from}{trip.date_to ? ` → ${trip.date_to}` : ''}</span>}
                    {trip.budget_per_night && <span>💰 £{trip.budget_per_night}/night budget</span>}
                  </div>
                  <p className="text-xs text-stone-300 mt-3 font-mono">Code: {trip.invite_code}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Create trip modal */}
      {showCreate && (
        <Modal title="New trip" onClose={() => setShowCreate(false)}>
          <div className="space-y-3">
            <Field label="Trip name *" value={name} onChange={setName} placeholder="Scottish Highlands, August" />
            <Field label="Description" value={description} onChange={setDescription} placeholder="Weekend away for 6 people…" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="From date" value={dateFrom} onChange={setDateFrom} type="date" />
              <Field label="To date" value={dateTo} onChange={setDateTo} type="date" />
            </div>
            <Field label="Budget per night (£)" value={budget} onChange={setBudget} type="number" placeholder="200" />
            <button onClick={createTrip} disabled={creating || !name} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50">
              {creating ? 'Creating…' : 'Create trip'}
            </button>
          </div>
        </Modal>
      )}

      {/* Join trip modal */}
      {showJoin && (
        <Modal title="Join a trip" onClose={() => { setShowJoin(false); setJoinError('') }}>
          <p className="text-sm text-stone-500 mb-3">Enter the 8-character invite code shared by the trip organiser.</p>
          <Field label="Invite code" value={joinCode} onChange={setJoinCode} placeholder="a1b2c3d4" />
          {joinError && <p className="text-red-500 text-sm mt-2">{joinError}</p>}
          <button onClick={joinTrip} disabled={joining || !joinCode} className="w-full mt-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50">
            {joining ? 'Joining…' : 'Join trip'}
          </button>
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-stone-100">
          <h2 className="font-semibold text-lg">{title}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 text-xl">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-500 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
    </div>
  )
}

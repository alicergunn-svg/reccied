'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { Profile, Reccie, Filters } from '@/lib/types'
import Nav from '@/components/Nav'
import ReccieCard from '@/components/ReccieCard'
import FilterBar from '@/components/FilterBar'
import AddReccieModal from '@/components/AddReccieModal'
import dynamic from 'next/dynamic'

const PlaceMap = dynamic(() => import('@/components/PlaceMap'), { ssr: false })

const DEFAULT_FILTERS: Filters = { search: '', maxCost: '', minSleeps: '', dogFriendly: false, showSaves: true }

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [reccies, setReccies] = useState<Reccie[]>([])
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [view, setView] = useState<'list' | 'map'>('list')
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(true)

  // Auth state
  const [email, setEmail] = useState('')
  const [authSent, setAuthSent] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) init(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      if (session?.user) init(session.user.id)
      else { setProfile(null); setReccies([]); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function init(userId: string) {
    setLoading(true)
    // Load profile
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(prof)

    // Load reccies from people I follow + my own
    const { data: followData } = await supabase.from('follows').select('following_id').eq('follower_id', userId)
    const followingIds = [userId, ...(followData ?? []).map((f: any) => f.following_id)]

    const { data } = await supabase
      .from('reccies')
      .select('*, place:places(*), profile:profiles(*)')
      .in('user_id', followingIds)
      .eq('is_public', true)
      .order('created_at', { ascending: false })

    setReccies((data ?? []) as Reccie[])
    setLoading(false)
  }

  // Apply filters
  const filtered = useMemo(() => {
    let result = reccies
    if (!filters.showSaves) result = result.filter(r => r.type === 'reccie')
    if (filters.dogFriendly) result = result.filter(r => r.place?.dog_friendly === true)
    if (filters.maxCost) result = result.filter(r => r.place?.cost_per_night != null && r.place.cost_per_night <= Number(filters.maxCost))
    if (filters.minSleeps) result = result.filter(r => r.place?.sleeps != null && r.place.sleeps >= Number(filters.minSleeps))
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(r =>
        r.place?.name?.toLowerCase().includes(q) ||
        r.place?.location?.toLowerCase().includes(q) ||
        r.what_made_it_special?.toLowerCase().includes(q) ||
        r.who_would_love_it?.toLowerCase().includes(q)
      )
    }
    return result
  }, [reccies, filters])

  function onReccieAdded(r: Reccie) {
    setReccies(prev => [r, ...prev])
  }

  function onReccieDeleted(id: string) {
    setReccies(prev => prev.filter(r => r.id !== id))
  }

  async function signIn() {
    setAuthLoading(true)
    await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })
    setAuthSent(true)
    setAuthLoading(false)
  }

  // ── Sign-in ───────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-forest-50 via-stone-50 to-forest-100 px-4">
        <div className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-md text-center">
          <h1 className="text-4xl font-bold tracking-tight text-forest-800 mb-2">Reccied</h1>
          <p className="text-stone-500 text-sm mb-8 leading-relaxed">
            The best places to stay,<br />recommended by people whose taste you trust.
          </p>
          {authSent ? (
            <p className="text-forest-700 font-medium">✅ Check your email for a magic link.</p>
          ) : (
            <>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && signIn()}
                className="w-full border border-stone-200 rounded-xl px-4 py-3 mb-3 focus:outline-none focus:ring-2 focus:ring-forest-300 text-sm"
                autoFocus
              />
              <button
                onClick={signIn}
                disabled={authLoading || !email}
                className="w-full bg-forest-600 hover:bg-forest-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
              >
                {authLoading ? 'Sending…' : 'Continue with email'}
              </button>
              <p className="text-xs text-stone-400 mt-3">No password needed — we'll send a link</p>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Main app ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen">
      <Nav profile={profile} onAdd={() => setShowAdd(true)} />

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <FilterBar filters={filters} onChange={setFilters} />
          <div className="flex rounded-xl border border-stone-200 overflow-hidden shrink-0">
            {(['list', 'map'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-1.5 text-sm font-medium transition ${view === v ? 'bg-forest-600 text-white' : 'bg-white text-stone-500 hover:bg-stone-50'}`}
              >
                {v === 'list' ? '☰ List' : '🗺 Map'}
              </button>
            ))}
          </div>
        </div>

        {/* States */}
        {loading ? (
          <div className="text-center py-24 text-stone-400">Loading your feed…</div>
        ) : reccies.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-stone-400 text-lg mb-2">Your feed is empty</p>
            <p className="text-stone-400 text-sm mb-6">Add your first reccie, or follow someone whose taste you trust.</p>
            <button
              onClick={() => setShowAdd(true)}
              className="bg-forest-600 hover:bg-forest-700 text-white px-6 py-2.5 rounded-full font-medium transition"
            >
              + Add a reccie
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-stone-400">No reccies match your filters.</div>
        ) : view === 'list' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(r => (
              <ReccieCard key={r.id} reccie={r} currentUserId={user.id} onDelete={onReccieDeleted} />
            ))}
          </div>
        ) : (
          <div className="h-[calc(100vh-180px)] rounded-2xl overflow-hidden border border-stone-200 shadow-sm">
            <PlaceMap reccies={filtered} />
          </div>
        )}
      </main>

      {showAdd && profile && (
        <AddReccieModal
          userId={user.id}
          profile={profile}
          onClose={() => setShowAdd(false)}
          onAdded={onReccieAdded}
        />
      )}
    </div>
  )
}

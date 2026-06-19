'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { Profile, Reccie } from '@/lib/types'
import ReccieCard from '@/components/ReccieCard'
import Nav from '@/components/Nav'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import AddReccieModal from '@/components/AddReccieModal'

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>()
  const [user, setUser] = useState<User | null>(null)
  const [myProfile, setMyProfile] = useState<Profile | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [reccies, setReccies] = useState<Reccie[]>([])
  const [tab, setTab] = useState<'reccies' | 'saves'>('reccies')
  const [following, setFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) loadMyProfile(session.user.id)
    })
  }, [])

  useEffect(() => {
    if (username) loadProfile()
  }, [username])

  async function loadMyProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setMyProfile(data)
  }

  async function loadProfile() {
    setLoading(true)
    const { data: prof } = await supabase.from('profiles').select('*').eq('username', username).single()
    if (!prof) { setLoading(false); return }
    setProfile(prof)

    // Load their reccies
    const { data } = await supabase
      .from('reccies')
      .select('*, place:places(*), profile:profiles(*)')
      .eq('user_id', prof.id)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
    setReccies((data ?? []) as Reccie[])

    // Follower count
    const { count } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', prof.id)
    setFollowerCount(count ?? 0)

    setLoading(false)
  }

  useEffect(() => {
    if (!user || !profile) return
    supabase.from('follows').select('*').eq('follower_id', user.id).eq('following_id', profile.id).single()
      .then(({ data }) => setFollowing(!!data))
  }, [user, profile])

  async function toggleFollow() {
    if (!user || !profile) return
    if (following) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', profile.id)
      setFollowing(false)
      setFollowerCount(c => c - 1)
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: profile.id })
      setFollowing(true)
      setFollowerCount(c => c + 1)
    }
  }

  const isOwn = user?.id === profile?.id
  const displayed = reccies.filter(r => tab === 'reccies' ? r.type === 'reccie' : r.type === 'save')

  function onReccieAdded(r: Reccie) {
    setReccies(prev => [r, ...prev])
  }

  return (
    <div className="min-h-screen">
      <Nav profile={myProfile} onAdd={() => setShowAdd(true)} />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-24 text-stone-400">Loading…</div>
        ) : !profile ? (
          <div className="text-center py-24">
            <p className="text-stone-400 mb-4">Profile not found.</p>
            <Link href="/" className="text-forest-600 hover:underline">← Back home</Link>
          </div>
        ) : (
          <>
            {/* Profile header */}
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-forest-100 text-forest-700 text-2xl font-bold flex items-center justify-center shrink-0">
                  {(profile.display_name ?? profile.username)[0].toUpperCase()}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-stone-900">{profile.display_name ?? profile.username}</h1>
                  <p className="text-stone-400 text-sm">@{profile.username}</p>
                  {profile.bio && <p className="text-stone-600 text-sm mt-1">{profile.bio}</p>}
                  <p className="text-stone-400 text-xs mt-1">
                    {followerCount} {followerCount === 1 ? 'follower' : 'followers'}
                  </p>
                </div>
              </div>

              {!isOwn && user && (
                <button
                  onClick={toggleFollow}
                  className={`px-5 py-2 rounded-full text-sm font-semibold transition ${following ? 'border border-stone-200 text-stone-600 hover:bg-stone-50' : 'bg-forest-600 hover:bg-forest-700 text-white'}`}
                >
                  {following ? 'Following' : 'Follow'}
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-stone-100 mb-6">
              {(['reccies', 'saves'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2.5 text-sm font-medium capitalize transition border-b-2 -mb-px ${tab === t ? 'border-forest-600 text-forest-700' : 'border-transparent text-stone-400 hover:text-stone-700'}`}
                >
                  {t} ({reccies.filter(r => r.type === t.slice(0, -1) as any || (t === 'saves' && r.type === 'save')).length})
                </button>
              ))}
            </div>

            {/* Grid */}
            {displayed.length === 0 ? (
              <div className="text-center py-16 text-stone-400">
                {isOwn ? `You haven't added any ${tab} yet.` : `No ${tab} yet.`}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {displayed.map(r => (
                  <ReccieCard key={r.id} reccie={r} currentUserId={user?.id} onDelete={id => setReccies(prev => prev.filter(r => r.id !== id))} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {showAdd && myProfile && user && (
        <AddReccieModal userId={user.id} profile={myProfile} onClose={() => setShowAdd(false)} onAdded={onReccieAdded} />
      )}
    </div>
  )
}

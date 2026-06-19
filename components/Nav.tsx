'use client'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/types'

interface Props {
  profile: Profile | null
  onAdd?: () => void
}

export default function Nav({ profile, onAdd }: Props) {
  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl tracking-tight text-forest-800">
          Reccied
        </Link>

        {profile && (
          <nav className="flex items-center gap-3">
            <button
              onClick={onAdd}
              className="bg-forest-600 hover:bg-forest-700 text-white text-sm font-semibold px-4 py-1.5 rounded-full transition"
            >
              + Add reccie
            </button>
            <Link
              href={`/profile/${profile.username}`}
              className="w-8 h-8 rounded-full bg-forest-100 text-forest-700 text-sm font-bold flex items-center justify-center hover:bg-forest-200 transition"
              title={profile.display_name ?? profile.username}
            >
              {(profile.display_name ?? profile.username)[0].toUpperCase()}
            </Link>
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-sm text-stone-400 hover:text-stone-700 transition"
            >
              Sign out
            </button>
          </nav>
        )}
      </div>
    </header>
  )
}

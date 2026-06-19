'use client'
import type { Reccie } from '@/lib/types'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useState } from 'react'

interface Props {
  reccie: Reccie
  currentUserId?: string
  onDelete?: (id: string) => void
  compact?: boolean
}

export default function ReccieCard({ reccie, currentUserId, onDelete, compact }: Props) {
  const [deleting, setDeleting] = useState(false)
  const { place, profile } = reccie
  const isOwner = reccie.user_id === currentUserId
  const isSave = reccie.type === 'save'
  const img = place?.images?.[0]

  async function handleDelete() {
    if (!confirm('Remove this reccie?')) return
    setDeleting(true)
    await supabase.from('reccies').delete().eq('id', reccie.id)
    onDelete?.(reccie.id)
  }

  return (
    <article className={`bg-white rounded-2xl border overflow-hidden group transition hover:shadow-md ${isSave ? 'border-stone-100 opacity-90' : 'border-stone-100'}`}>
      {/* Image */}
      <div className="relative h-48 bg-stone-100">
        {img ? (
          <Image src={img} alt={place?.name ?? ''} fill className="object-cover" unoptimized />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">🏡</div>
        )}

        {/* Type badge */}
        <div className={`absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full ${isSave ? 'bg-stone-800/70 text-stone-100' : 'bg-forest-600 text-white'}`}>
          {isSave ? '🔖 Saved' : '✦ Reccie'}
        </div>

        {place?.dog_friendly && (
          <div className="absolute top-3 right-3 bg-white/90 text-xs font-medium px-2 py-0.5 rounded-full">🐕</div>
        )}

        {isOwner && !compact && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="absolute bottom-3 right-3 bg-white/80 hover:bg-red-50 text-red-500 text-xs px-2.5 py-1 rounded-full opacity-0 group-hover:opacity-100 transition"
          >
            Remove
          </button>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        {/* Who recommended it */}
        {profile && (
          <Link href={`/profile/${profile.username}`} className="flex items-center gap-2 mb-3 group/profile">
            <div className="w-6 h-6 rounded-full bg-forest-100 text-forest-700 text-xs font-bold flex items-center justify-center shrink-0">
              {(profile.display_name ?? profile.username)[0].toUpperCase()}
            </div>
            <span className="text-xs text-stone-500 group-hover/profile:text-forest-700 transition">
              {profile.display_name ?? profile.username}
            </span>
          </Link>
        )}

        <h3 className="font-semibold text-stone-900 leading-snug mb-0.5 truncate">{place?.name}</h3>
        <p className="text-sm text-stone-400 mb-3 truncate">📍 {place?.location}</p>

        {/* Facts */}
        <div className="flex flex-wrap gap-3 text-sm text-stone-600 mb-3">
          {place?.cost_per_night && (
            <span className="font-semibold text-forest-700">£{place.cost_per_night}<span className="font-normal text-stone-400">/night</span></span>
          )}
          {place?.sleeps && <span className="text-stone-400">Sleeps {place.sleeps}</span>}
        </div>

        {/* Story (reccies only) */}
        {!isSave && reccie.what_made_it_special && (
          <blockquote className="text-sm text-stone-600 italic border-l-2 border-forest-200 pl-3 mb-2 line-clamp-3">
            "{reccie.what_made_it_special}"
          </blockquote>
        )}

        {/* Save note */}
        {isSave && reccie.save_note && (
          <p className="text-sm text-stone-500 italic line-clamp-2">{reccie.save_note}</p>
        )}

        <a
          href={place?.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-xs text-forest-600 hover:underline"
        >
          View listing ↗
        </a>
      </div>
    </article>
  )
}

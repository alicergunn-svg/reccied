'use client'
import type { Place } from '@/lib/types'
import Image from 'next/image'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  place: Place
  userId: string
  onDelete?: (id: string) => void
  compact?: boolean
}

export default function PlaceCard({ place, userId, onDelete, compact }: Props) {
  const [deleting, setDeleting] = useState(false)
  const isOwner = place.user_id === userId
  const img = place.images?.[0]

  async function handleDelete() {
    if (!confirm('Remove this place?')) return
    setDeleting(true)
    await supabase.from('places').delete().eq('id', place.id)
    onDelete?.(place.id)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden hover:shadow-md transition group">
      {/* Image */}
      <div className="relative h-44 bg-stone-100">
        {img ? (
          <Image src={img} alt={place.name} fill className="object-cover" unoptimized />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🏡</div>
        )}
        {place.dog_friendly === true && (
          <span className="absolute top-2 left-2 bg-white/90 text-xs font-medium px-2 py-0.5 rounded-full">🐕 Dog friendly</span>
        )}
        {isOwner && !compact && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="absolute top-2 right-2 bg-white/80 hover:bg-red-50 text-red-500 text-xs px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition"
          >
            Remove
          </button>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="font-semibold text-stone-900 truncate">{place.name}</h3>
        <p className="text-sm text-stone-500 mb-2 truncate">📍 {place.location}</p>

        <div className="flex items-center gap-3 text-sm text-stone-600 mb-3">
          {place.cost_per_night && (
            <span className="font-medium text-brand-700">£{place.cost_per_night}/night</span>
          )}
          {place.sleeps && <span>👥 Sleeps {place.sleeps}</span>}
        </div>

        {place.best_bits?.length > 0 && (
          <ul className="space-y-0.5">
            {place.best_bits.slice(0, 3).map((b, i) => (
              <li key={i} className="text-xs text-stone-500 flex gap-1.5">
                <span className="text-brand-500">✦</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}

        <a
          href={place.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block text-xs text-brand-600 hover:underline truncate"
        >
          View original listing ↗
        </a>
      </div>
    </div>
  )
}

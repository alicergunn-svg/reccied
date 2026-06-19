'use client'
import type { Filters } from '@/lib/types'

interface Props {
  filters: Filters
  onChange: (f: Filters) => void
}

export default function FilterBar({ filters, onChange }: Props) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch })

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="text"
        placeholder="Search places or locations…"
        value={filters.search}
        onChange={e => set({ search: e.target.value })}
        className="border border-stone-200 bg-white rounded-full px-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-300 w-52"
      />
      <input
        type="number"
        placeholder="Max £/night"
        value={filters.maxCost}
        onChange={e => set({ maxCost: e.target.value })}
        className="border border-stone-200 bg-white rounded-full px-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-300 w-32"
      />
      <input
        type="number"
        placeholder="Min sleeps"
        value={filters.minSleeps}
        onChange={e => set({ minSleeps: e.target.value })}
        className="border border-stone-200 bg-white rounded-full px-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-300 w-28"
      />
      <label className="flex items-center gap-1.5 text-sm text-stone-600 cursor-pointer select-none bg-white border border-stone-200 rounded-full px-3 py-1.5">
        <input
          type="checkbox"
          checked={filters.dogFriendly}
          onChange={e => set({ dogFriendly: e.target.checked })}
          className="accent-forest-600"
        />
        🐕 Dog friendly
      </label>
      <label className="flex items-center gap-1.5 text-sm text-stone-600 cursor-pointer select-none bg-white border border-stone-200 rounded-full px-3 py-1.5">
        <input
          type="checkbox"
          checked={filters.showSaves}
          onChange={e => set({ showSaves: e.target.checked })}
          className="accent-forest-600"
        />
        Show saves
      </label>
    </div>
  )
}

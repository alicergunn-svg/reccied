export interface Profile {
  id: string
  email: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  created_at: string
}

export interface Place {
  id: string
  url: string
  name: string
  location: string
  lat: number | null
  lng: number | null
  cost_per_night: number | null
  sleeps: number | null
  dog_friendly: boolean | null
  images: string[]
}

export interface Reccie {
  id: string
  created_at: string
  user_id: string
  place_id: string
  type: 'reccie' | 'save'
  // Story prompts (reccies only)
  what_made_it_special: string | null
  who_would_love_it: string | null
  best_tip: string | null
  what_to_do_nearby: string | null
  // Save note (saves only)
  save_note: string | null
  is_public: boolean
  // Joined
  place?: Place
  profile?: Profile
}

export interface Follow {
  follower_id: string
  following_id: string
}

export interface ExtractedPlace {
  name: string
  location: string
  lat: number | null
  lng: number | null
  cost_per_night: number | null
  sleeps: number | null
  dog_friendly: boolean | null
  images: string[]
}

export interface Filters {
  search: string
  maxCost: string
  minSleeps: string
  dogFriendly: boolean
  showSaves: boolean
}

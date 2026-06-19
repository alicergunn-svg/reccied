import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase(req: NextRequest) {
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace('Bearer ', '')
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
}

export async function GET(req: NextRequest) {
  const supabase = getSupabase(req)
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('invite_code')

  if (code) {
    const { data, error } = await supabase.from('trips').select('*').eq('invite_code', code).single()
    if (error) return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    return NextResponse.json(data)
  }

  // Get trips where the user is a member or owner
  const { data, error } = await supabase
    .from('trips')
    .select('*, trip_members(*)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase(req)
  const body = await req.json()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .insert({ ...body, owner_id: user.id })
    .select()
    .single()

  if (tripError) return NextResponse.json({ error: tripError.message }, { status: 500 })

  // Add creator as owner member
  await supabase.from('trip_members').insert({ trip_id: trip.id, user_id: user.id, role: 'owner' })

  return NextResponse.json(trip)
}

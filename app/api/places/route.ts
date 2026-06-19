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
  const userId = searchParams.get('user_id')

  let query = supabase.from('places').select('*').order('created_at', { ascending: false })
  if (userId) query = query.eq('user_id', userId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase(req)
  const body = await req.json()

  const { data, error } = await supabase.from('places').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const supabase = getSupabase(req)
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  const { error } = await supabase.from('places').delete().eq('id', id!)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

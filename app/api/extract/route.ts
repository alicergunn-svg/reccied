import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

  // Fetch page content
  let pageText = `Could not fetch page. URL: ${url}`
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-GB,en;q=0.9',
      },
      signal: AbortSignal.timeout(12000),
    })
    const html = await res.text()
    pageText = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 14000)
  } catch { /* use fallback pageText */ }

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Extract accommodation details from this page and return ONLY valid JSON with no markdown.

URL: ${url}

Page text:
${pageText}

Return exactly this structure (null for anything you cannot find):
{
  "name": "property name",
  "location": "village or town, county/region, country",
  "lat": null,
  "lng": null,
  "cost_per_night": 195,
  "sleeps": 8,
  "dog_friendly": true,
  "images": ["https://...", "https://..."]
}

Rules:
- cost_per_night: number in GBP (or closest currency), no currency symbol, null if unknown
- sleeps: integer, null if unknown
- dog_friendly: true / false / null
- images: up to 5 absolute https image URLs from the page, or []
- lat/lng: only if you can infer confidently from the location — otherwise null`
    }],
  })

  const raw = (message.content[0] as { type: string; text: string }).text.trim()
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()

  try {
    return NextResponse.json({ data: JSON.parse(cleaned) })
  } catch {
    return NextResponse.json({ error: 'Parse failed', raw }, { status: 500 })
  }
}

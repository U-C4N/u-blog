import { NextRequest, NextResponse } from 'next/server'
import { env } from '../../../env.mjs'

// Minimal Groq client using fetch to call moonshotai/kimi-k2-instruct
// We avoid adding SDK deps; use server-only route with GROQ_API_KEY from env

export async function POST(req: NextRequest) {
  try {
    const apiKey = env.GROQ_API_KEY || process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing GROQ_API_KEY' }, { status: 500 })
    }

    const body = await req.json()
    const { title, content } = body as { title: string; content: string }
    if (!title || !content) {
      return NextResponse.json({ error: 'Missing title or content' }, { status: 400 })
    }

    const prompt = `You are an SEO expert. Given a blog post title and full markdown content, produce concise SEO fields:
- metaTitle: up to 60 chars, compelling, includes primary keyword
- metaDescription: 140-160 chars, natural, includes 1-2 keywords, no emojis
- tags: 5-8 lowercase slug-like tags (no spaces; use hyphens if needed)
- noindex: false unless content is extremely thin or a duplicate

Return strict JSON with keys: metaTitle, metaDescription, tags (array of strings), noindex (boolean).

TITLE:\n${title}\n\nCONTENT:\n${content.substring(0, 8000)}`

    const requestedModel = 'moonshotai/kimi-k2-instruct'
    const fallbackModel = process.env.GROQ_FALLBACK_MODEL || 'llama-3.1-70b-versatile'

    const callGroq = async (model: string) => {
      return fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: 'You are a precise JSON generator.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.4,
          max_tokens: 600,
          response_format: { type: 'json_object' },
        }),
      })
    }

    let resp = await callGroq(requestedModel)
    if (!resp.ok) {
      try {
        const t = await resp.text()
        if (/model|not found|available|unsupported/i.test(t)) {
          resp = await callGroq(fallbackModel)
        } else {
          return NextResponse.json({ error: 'Groq API error', details: t }, { status: 500 })
        }
      } catch {
        resp = await callGroq(fallbackModel)
      }
    }

    if (!resp.ok) {
      const t = await resp.text()
      return NextResponse.json({ error: 'Groq API error (fallback failed)', details: t }, { status: 500 })
    }

    const data = await resp.json()
    const raw = data?.choices?.[0]?.message?.content
    let parsed: any
    try {
      parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    } catch {
      parsed = {}
    }

    const safe = {
      metaTitle: typeof parsed?.metaTitle === 'string' ? parsed.metaTitle.slice(0, 80) : '',
      metaDescription: typeof parsed?.metaDescription === 'string' ? parsed.metaDescription.slice(0, 180) : '',
      tags: Array.isArray(parsed?.tags) ? parsed.tags.filter((t: any) => typeof t === 'string').slice(0, 10) : [],
      noindex: typeof parsed?.noindex === 'boolean' ? parsed.noindex : false,
    }

    return NextResponse.json(safe)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unexpected error' }, { status: 500 })
  }
}



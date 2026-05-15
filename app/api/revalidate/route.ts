import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyBearerAdmin } from '@/lib/supabase/auth'

const SLUG_RE = /^[a-z0-9-]+$/

export async function POST(request: Request) {
  // Prefer cookie-based session (set by middleware on every nav). Fall back to
  // legacy Bearer header for older client code paths.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let authedUser = user
  if (!authedUser) {
    authedUser = await verifyBearerAdmin(request.headers.get('Authorization'))
  }

  if (!authedUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let slug = new URL(request.url).searchParams.get('slug')
  if (!slug) {
    try {
      const body = await request.json()
      if (body && typeof body.slug === 'string') slug = body.slug
    } catch {
      // no body or non-JSON; ignore
    }
  }

  if (slug && SLUG_RE.test(slug)) {
    revalidatePath(`/blog/${slug}`)
  }

  revalidatePath('/blog')
  revalidatePath('/')
  return NextResponse.json({ revalidated: true, slug: slug ?? null })
}

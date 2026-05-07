import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyBearerAdmin } from '@/lib/supabase/auth'

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

  revalidatePath('/blog')
  revalidatePath('/')
  return NextResponse.json({ revalidated: true })
}

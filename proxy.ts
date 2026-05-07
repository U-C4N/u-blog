import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const { pathname } = request.nextUrl

  // Skip auth/visit work on internal/static paths
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return supabaseResponse
  }

  // CRITICAL: do not run code between createServerClient and getUser/getClaims.
  // Misordering here is the #1 cause of "users randomly logged out" bugs.
  if (pathname.startsWith('/adminos') && pathname !== '/adminos/login') {
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      const loginUrl = new URL('/adminos/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  if (!pathname.startsWith('/adminos')) {
    supabase
      .from('visits')
      .insert({ pathname })
      .then(({ error }) => {
        if (error) {
          console.error('Error logging visit:', pathname, error.message)
        }
      })
  }

  // ALWAYS return the supabaseResponse, never a fresh NextResponse —
  // otherwise refreshed auth cookies are dropped and users get logged out.
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

interface CookieMethods {
  get(name: string): string | undefined
  getAll(): { name: string; value: string }[]
  set(name: string, value: string, options?: {
    domain?: string
    path?: string
    maxAge?: number
    expires?: Date
    httpOnly?: boolean
    secure?: boolean
    sameSite?: 'strict' | 'lax' | 'none'
  }): void
  remove(name: string, options?: {
    domain?: string
    path?: string
    maxAge?: number
    expires?: Date
    httpOnly?: boolean
    secure?: boolean
    sameSite?: 'strict' | 'lax' | 'none'
  }): void
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const cookieHandler: CookieMethods = {
    get(name: string) {
      return request.cookies.get(name)?.value
    },
    getAll() {
      return request.cookies.getAll().map((cookie) => ({
        name: cookie.name,
        value: cookie.value,
      }))
    },
    set(name: string, value: string, options = {}) {
      response.cookies.set({
        name,
        value,
        ...options,
      })
    },
    remove(name: string, options = {}) {
      response.cookies.set({
        name,
        value: '',
        ...options,
      })
    },
  }

  // @ts-ignore Supabase expects a compatible cookie adapter shape.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: cookieHandler,
    },
  )

  const { pathname } = request.nextUrl

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return response
  }

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

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}

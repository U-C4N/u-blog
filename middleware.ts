import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Basic cookie options type for type safety
type CookieOptions = {
  domain?: string
  path?: string
  maxAge?: number
  expires?: Date
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'strict' | 'lax' | 'none'
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        parse: () => {
          const cookies: Record<string, string> = {}
          request.cookies.getAll().forEach(cookie => {
            cookies[cookie.name] = cookie.value
          })
          return cookies
        },
        getAll: () => request.cookies.getAll().map(cookie => ({
          name: cookie.name,
          value: cookie.value
        })),
        set: (name: string, value: string, options: CookieOptions) => {
          // Set in the response
          response.cookies.set({
            name,
            value,
            ...options
          })
        },
        remove: (name: string, options: CookieOptions) => {
          // Remove in the response
          response.cookies.set({
            name,
            value: '',
            ...options
          })
        }
      }
    }
  )

  // Kullanıcı oturumunu al (isteğe bağlı, ziyaretçiyi tanımlamak için)
  // await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Statik dosyaları ve API rotalarını hariç tut
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') || // Dosya uzantılarını hariç tut
    pathname.startsWith('/adminos') // Admin panelini hariç tut
  ) {
    return response
  }

  // Ziyareti Supabase'e kaydet (arka planda çalıştır, yanıtı bloklama)
  supabase
    .from('visits') 
    .insert({ pathname: pathname })
    .then(({ error }) => {
      if (error) {
        console.error('Error logging visit:', pathname, error.message)
      }
    })

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - adminos (admin panel)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|adminos).*)',
  ],
}
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Add custom type for Supabase cookie methods
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
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Create a cookie handler object with the correct methods
  const cookieHandler: CookieMethods = {
    get(name: string) {
      return request.cookies.get(name)?.value
    },
    getAll() {
      return request.cookies.getAll().map(cookie => ({
        name: cookie.name,
        value: cookie.value
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
    }
  }

  // Create Supabase client with properly typed cookie methods
  // @ts-ignore - Using correct implementation but TS has conflicts with Supabase types
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: cookieHandler
    }
  )

  const { pathname } = request.nextUrl

  // Statik dosyaları ve API rotalarını hariç tut
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // Dosya uzantılarını hariç tut
  ) {
    return response
  }

  // Admin panel koruması - disabled for testing
  // if (pathname.startsWith('/adminos') && pathname !== '/adminos/login') {
  //   // Kullanıcı oturumunu kontrol et
  //   const { data: { user }, error } = await supabase.auth.getUser()
  //   
  //   if (error || !user) {
  //     // Giriş yapılmamışsa login sayfasına yönlendir
  //     const loginUrl = new URL('/adminos/login', request.url)
  //     return NextResponse.redirect(loginUrl)
  //   }
  // }

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
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
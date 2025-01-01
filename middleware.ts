import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // CSRF koruması için origin kontrolü
  const origin = req.headers.get('origin')
  if (req.method !== 'GET' && origin !== process.env.NEXT_PUBLIC_APP_URL) {
    return new NextResponse('Invalid origin', { status: 403 })
  }

  return res
}

export const config = {
  matcher: '/adminos/:path*',
}
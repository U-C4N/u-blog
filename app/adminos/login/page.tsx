'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Code2 } from 'lucide-react'
import { getSupabaseBrowser } from '@/lib/supabase/config'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Check if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = getSupabaseBrowser()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push('/adminos/dashboard')
      }
    }
    checkAuth()
  }, [router])

  const handleSubmit = async () => {
    setIsLoading(true)
    setError('')

    const emailInput = document.getElementById('email') as HTMLInputElement
    const passwordInput = document.getElementById('password') as HTMLInputElement

    const email = emailInput?.value || ''
    const password = passwordInput?.value || ''

    if (!email || !password) {
      setError('Email ve şifre gerekli!')
      setIsLoading(false)
      return
    }

    try {
      // Use Supabase Auth for login
      const supabase = getSupabaseBrowser()
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError('Yanlış email veya şifre!')
        setIsLoading(false)
        return
      }

      if (data.session) {
        // Successfully logged in
        router.push('/adminos/dashboard')
        router.refresh()
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Giriş yapılırken bir hata oluştu!')
      setIsLoading(false)
    }
  }

  return (
    <main className="max-w-[1000px] mx-auto px-6 py-16">
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <div className="w-full max-w-md">
          <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-white/40 dark:border-gray-700/40 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] p-8">
            <div className="flex items-center gap-2 mb-8 justify-center">
              <h1 className="text-[22px] font-medium tracking-tight">Admin</h1>
              <span className="text-[22px] text-muted-foreground">~</span>
              <div className="flex items-center gap-1">
                <span className="text-[22px]">Login</span>
                <Code2 className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-xl border border-destructive/20">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="text-sm font-medium text-muted-foreground block mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="Email adresinizi girin"
                  className="w-full px-4 py-2.5 bg-white/50 dark:bg-gray-800/50 border border-white/60 dark:border-gray-600/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 backdrop-blur-sm transition-all duration-200"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="text-sm font-medium text-muted-foreground block mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="Şifrenizi girin"
                  className="w-full px-4 py-2.5 bg-white/50 dark:bg-gray-800/50 border border-white/60 dark:border-gray-600/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 backdrop-blur-sm transition-all duration-200"
                  required
                />
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full bg-primary text-primary-foreground py-2.5 px-4 rounded-xl hover:bg-primary/90 transition-all duration-200 disabled:opacity-50 font-medium shadow-sm hover:shadow-md"
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  )
}
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Code2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const username = formData.get('username')
    const password = formData.get('password')

    // Simple admin/admin check
    if (username === 'admin' && password === 'admin') {
      localStorage.setItem('adminAuth', 'true')
      router.push('/adminos/dashboard')
    } else {
      setError('Invalid credentials')
    }
    
    setIsLoading(false)
  }

  return (
    <main className="max-w-[1000px] mx-auto px-6 py-16">
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8 justify-center">
            <h1 className="text-[22px] font-medium tracking-tight">Admin</h1>
            <span className="text-[22px] text-muted-foreground">~</span>
            <div className="flex items-center gap-1">
              <span className="text-[22px]">Login</span>
              <Code2 className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}
            
            <div>
              <label htmlFor="username" className="text-[15px] text-muted-foreground block mb-2">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                defaultValue="admin"
                className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="text-[15px] text-muted-foreground block mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                defaultValue="admin"
                className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
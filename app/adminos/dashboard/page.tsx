'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Code2, LogOut, PenSquare, User, MessageSquare } from 'lucide-react'
import { Section } from '@/components/section'
import { ProjectLink } from '@/components/project-link'
import { getSupabaseBrowser } from '@/lib/supabase/config'

export default function DashboardPage() {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const supabase = getSupabaseBrowser()
      await supabase.auth.signOut()
      router.push('/adminos/login')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
      setIsLoggingOut(false)
    }
  }

  return (
    <main className="max-w-[1000px] mx-auto px-6 py-16">
      <header className="mb-12">
        <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-white/40 dark:border-gray-700/40 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-medium tracking-tight">Admin</h1>
              <span className="text-[22px] text-muted-foreground">~</span>
              <div className="flex items-center gap-1">
                <span className="text-[22px]">Dashboard</span>
                <Code2 className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground bg-white/40 dark:bg-gray-800/40 border border-white/50 dark:border-gray-600/30 rounded-xl hover:bg-white/60 dark:hover:bg-gray-800/60 transition-all duration-200 disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
            </button>
          </div>

          <p className="text-[15px] text-muted-foreground leading-relaxed">
            Welcome to the admin dashboard. Manage your content here.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-12">
        <Section title="Content">
          <ProjectLink
            href="/adminos/dashboard/posts"
            title="Blog Posts"
            description="Manage your blog posts and articles"
            icon={<PenSquare className="w-5 h-5" />}
          />
          <ProjectLink
            href="/adminos/dashboard/prompts"
            title="Prompts"
            description="Manage your AI prompts collection"
            icon={<MessageSquare className="w-5 h-5" />}
          />
          <ProjectLink
            href="/adminos/dashboard/profile"
            title="Profile"
            description="Update your personal information"
            icon={<User className="w-5 h-5" />}
          />
        </Section>
      </div>
    </main>
  )
}
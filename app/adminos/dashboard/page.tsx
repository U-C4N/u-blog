'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Code2, LogOut, PenSquare, User, BarChart2, Gauge } from 'lucide-react'
import { Section } from '@/components/section'
import { ProjectLink } from '@/components/project-link'

export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('adminAuth')
    if (!isAuthenticated) {
      router.push('/adminos/login')
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('adminAuth')
    router.push('/adminos/login')
  }

  return (
    <main className="max-w-[1000px] mx-auto px-6 py-16">
      <header className="mb-16">
        <div className="flex items-center justify-between mb-8">
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
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-[15px]">Logout</span>
          </button>
        </div>

        <p className="text-[15px] text-muted-foreground leading-relaxed">
          Welcome to the admin dashboard. Manage your content here.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
        <Section title="Content">
          <ProjectLink
            href="/adminos/dashboard/posts"
            title="Blog Posts"
            description="Manage your blog posts and articles"
            icon={<PenSquare className="w-5 h-5" />}
          />
          <ProjectLink
            href="/adminos/dashboard/profile"
            title="Profile"
            description="Update your personal information"
            icon={<User className="w-5 h-5" />}
          />
        </Section>

        <Section title="Analytics">
          <ProjectLink
            href="#"
            title="Statistics"
            description="View website traffic and engagement"
            icon={<BarChart2 className="w-5 h-5" />}
          />
          <ProjectLink
            href="#"
            title="Performance"
            description="Monitor website performance metrics"
            icon={<Gauge className="w-5 h-5" />}
          />
        </Section>
      </div>
    </main>
  )
}
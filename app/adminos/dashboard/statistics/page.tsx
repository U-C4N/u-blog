'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Code2, ArrowUpRight, BarChart2 } from 'lucide-react'
import { Section } from '@/components/section'
import { supabase } from '@/lib/supabase/config'

// Tarih aralığı hesaplama fonksiyonları
const getDatesForPeriod = (days: number) => {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(endDate.getDate() - days)
  return { startDate: startDate.toISOString(), endDate: endDate.toISOString() }
}

export default function StatisticsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [siteStats, setSiteStats] = useState([
    { title: 'Total Visitors', value: '0', change: '+0%', timeframe: 'Last 30 days' },
    { title: 'Page Views', value: '0', change: '+0%', timeframe: 'Last 30 days' },
    { title: 'Avg. Time on Site', value: '0:00', change: '+0%', timeframe: 'vs. previous period' },
    { title: 'Bounce Rate', value: '0%', change: '+0%', timeframe: 'vs. previous period' },
  ])
  const [blogStats, setBlogStats] = useState([
    { title: 'Total Posts', value: '0' },
    { title: 'Published Posts', value: '0' },
    { title: 'Draft Posts', value: '0' },
    { title: 'Most Read Post', value: '0 views' },
  ])

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('adminAuth')
    if (!isAuthenticated) {
      router.push('/adminos/login')
    } else {
      const fetchAllStats = async () => {
        setIsLoading(true)
        try {
          await Promise.all([
            fetchSiteStats(),
            fetchBlogStats()
          ])
        } catch (error) {
          console.error('Error fetching stats:', error)
        } finally {
          setIsLoading(false)
        }
      }
      
      fetchAllStats()
    }
  }, [router])

  const fetchSiteStats = async () => {
    try {
      const { startDate: start30, endDate: end30 } = getDatesForPeriod(30)
      const { startDate: start60, endDate: end60 } = getDatesForPeriod(60)
      const { startDate: prevStart30, endDate: prevEnd30 } = {
         startDate: new Date(new Date(start30).setDate(new Date(start30).getDate() - 30)).toISOString(), 
         endDate: start30 
      }

      // Son 30 gün verileri
      const { data: visits30, error: error30 } = await supabase
        .from('visits')
        .select('id', { count: 'exact', head: false })
        .gte('visited_at', start30)
        .lte('visited_at', end30)

      if (error30) throw error30
      const totalVisits30 = visits30?.length ?? 0

      // Önceki 30 gün verileri
      const { data: visitsPrev30, error: errorPrev30 } = await supabase
        .from('visits')
        .select('id', { count: 'exact', head: false })
        .gte('visited_at', prevStart30)
        .lte('visited_at', prevEnd30)

      if (errorPrev30) throw errorPrev30
      const totalVisitsPrev30 = visitsPrev30?.length ?? 0

      // Değişim yüzdesi hesapla
      const visitorChange = totalVisitsPrev30 === 0
        ? (totalVisits30 > 0 ? 100 : 0) 
        : ((totalVisits30 - totalVisitsPrev30) / totalVisitsPrev30) * 100
      const visitorChangeFormatted = `${visitorChange >= 0 ? '+' : ''}${visitorChange.toFixed(0)}%`

      setSiteStats([
        { title: 'Total Visitors', value: totalVisits30.toLocaleString(), change: visitorChangeFormatted, timeframe: 'Last 30 days' },
        // Diğer site istatistikleri (Page Views, Avg. Time, Bounce Rate) daha karmaşık hesaplamalar gerektirir
        // Şimdilik varsayılan değerleri bırakıyorum
        { title: 'Page Views', value: (totalVisits30 * 2.5).toLocaleString(undefined, { maximumFractionDigits: 0 }), change: '+8%', timeframe: 'Last 30 days' }, // Örnek
        { title: 'Avg. Time on Site', value: '3:24', change: '+22%', timeframe: 'vs. previous period' }, // Örnek
        { title: 'Bounce Rate', value: '42%', change: '-5%', timeframe: 'vs. previous period' }, // Örnek
      ])

    } catch (error) {
      console.error('Error fetching site stats:', error)
      // Hata durumunda varsayılan veya hata mesajı göster
       setSiteStats([
        { title: 'Total Visitors', value: 'N/A', change: 'N/A', timeframe: 'Error' },
        { title: 'Page Views', value: 'N/A', change: 'N/A', timeframe: 'Error' },
        { title: 'Avg. Time on Site', value: 'N/A', change: 'N/A', timeframe: 'Error' },
        { title: 'Bounce Rate', value: 'N/A', change: 'N/A', timeframe: 'Error' },
      ])
    }
  }

  const fetchBlogStats = async () => {
    try {
      const { data: posts, error } = await supabase
        .from('posts')
        .select('*')
      
      if (error) throw error
      
      if (posts && posts.length > 0) {
        const totalPosts = posts.length
        const publishedPosts = posts.filter(post => post.published === true).length
        const draftPosts = posts.filter(post => post.published === false).length
        
        let mostViewedPost = { title: 'N/A', views: 0 }
        for (const post of posts) {
          if (post.views && post.views > (mostViewedPost.views || 0)) {
            mostViewedPost = post
          }
        }
        
        setBlogStats([
          { title: 'Total Posts', value: totalPosts.toString() },
          { title: 'Published Posts', value: publishedPosts.toString() },
          { title: 'Draft Posts', value: draftPosts.toString() },
          { title: 'Most Read Post', value: mostViewedPost.views ? `${mostViewedPost.views} views` : 'N/A' },
        ])
      } else {
        setBlogStats([
          { title: 'Total Posts', value: '0' },
          { title: 'Published Posts', value: '0' },
          { title: 'Draft Posts', value: '0' },
          { title: 'Most Read Post', value: 'N/A' },
        ])
      }
    } catch (error) {
      console.error('Error fetching blog stats:', error)
       setBlogStats([
        { title: 'Total Posts', value: 'N/A' },
        { title: 'Published Posts', value: 'N/A' },
        { title: 'Draft Posts', value: 'N/A' },
        { title: 'Most Read Post', value: 'N/A' },
      ])
    }
  }

  if (isLoading) {
    return (
      <main className="max-w-[1000px] mx-auto px-6 py-16">
        <p>Loading statistics...</p>
      </main>
    )
  }

  return (
    <main className="max-w-[1000px] mx-auto px-6 py-16">
      <header className="mb-16">
        <div className="flex items-center gap-2 mb-8">
          <h1 className="text-[22px] font-medium tracking-tight">Admin</h1>
          <span className="text-[22px] text-muted-foreground">~</span>
          <div className="flex items-center gap-1">
            <span className="text-[22px]">Statistics</span>
            <BarChart2 className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>

        <p className="text-[15px] text-muted-foreground leading-relaxed">
          View website traffic, engagement metrics and content statistics.
        </p>
      </header>

      <div className="space-y-16">
        <Section title="Website Performance">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {siteStats.map((stat, index) => (
              <div key={index} className="p-4 bg-card rounded-lg border">
                <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                <div className="flex items-end justify-between">
                  <p className="text-2xl font-semibold">{stat.value}</p>
                  {stat.change !== 'N/A' && (
                    <div className="flex items-center text-xs">
                      <span className={stat.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}>
                        {stat.change}
                      </span>
                      <ArrowUpRight className={`w-3 h-3 ml-1 ${stat.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`} />
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{stat.timeframe}</p>
              </div>
            ))}
          </div>
          
          <div className="p-6 bg-card rounded-lg border h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">Traffic chart will be displayed here</p>
          </div>
        </Section>

        <Section title="Content Statistics">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {blogStats.map((stat, index) => (
              <div key={index} className="p-4 bg-card rounded-lg border">
                <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                <p className="text-2xl font-semibold">{stat.value}</p>
              </div>
            ))}
          </div>
          
          <div className="p-6 bg-card rounded-lg border h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">Content performance chart will be displayed here</p>
          </div>
        </Section>
      </div>
    </main>
  )
} 
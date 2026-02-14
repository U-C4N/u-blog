import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Code2, Twitter, Linkedin, Github, Copy, Check, ExternalLink, Star, Sparkles, BookOpen, Wrench, PenLine } from 'lucide-react'
import { ProjectLink } from '@/components/project-link'
import { Section } from '@/components/section'
import { supabase, type Profile, type Building, type GithubRepo, type Prompt } from '@/lib/supabase/config'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { env } from '@/env.mjs'
import CopyButton from '@/components/copy-button'

// Dynamic metadata generation
export async function generateMetadata(): Promise<Metadata> {
  // Fetch profile data for metadata
  const profileRes = await supabase.from('profiles').select('*').limit(1).maybeSingle()
  const profile = profileRes.data || {
    name: 'Umutcan Edizaslan',
    subtitle: 'Software Engineer ~ AI Master\'s Student',
    meta_description: 'Software Engineer and AI Master\'s Student. Personal website and blog.',
    og_image_url: '',
    twitter_card_type: 'summary_large_image',
    meta_keywords: []
  }

  const title = `${profile.name} - ${profile.subtitle} | U-BLOG`
  const description = profile.meta_description || profile.subtitle

  return {
    title,
    description,
    keywords: (profile.meta_keywords as string[] | null) || [],
    openGraph: {
      type: 'website',
      url: env.NEXT_PUBLIC_SITE_URL,
      title,
      description,
      images: profile.og_image_url ? [profile.og_image_url] : undefined,
    },
    twitter: {
      card: (profile.twitter_card_type as any) || 'summary_large_image',
      title,
      description,
      images: profile.og_image_url ? [profile.og_image_url] : undefined,
    },
  }
}

// For data fetching
export const revalidate = 60 // Revalidate every minute

function truncateDescription(description: string, maxLength: number = 150): string {
  if (!description) return '';
  if (description.length <= maxLength) return description;
  return description.slice(0, maxLength).trim() + '...';
}

// Generate person structured data
function generatePersonStructuredData(profile: Profile) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.name,
    jobTitle: profile.subtitle,
    url: env.NEXT_PUBLIC_SITE_URL,
    sameAs: [
      profile.social_links?.github,
      profile.social_links?.twitter,
      profile.social_links?.linkedin,
    ].filter(Boolean),
  }
}

const defaultProfile: Profile = {
  id: crypto.randomUUID(),
  name: 'Umutcan Edizaslan',
  title: 'MR.Creator',
  subtitle: 'Software Engineer ~ AI Master\'s Student',
  present_text: [
    'I work as a full-stack engineer at Globant, contributing to Disney O&I Engineering Team.',
    'I like to build developer tools for myself and make them open source for the community.'
  ],
  social_links: {
    twitter: '',
    linkedin: '',
    github: ''
  }
}

export default async function Home() {
  // Fetch data server-side
  const [profileRes, buildingsRes, reposRes, promptsRes] = await Promise.allSettled([
    supabase.from('profiles').select('*').limit(1).maybeSingle(),
    supabase.from('buildings').select('*').order('order_index'),
    supabase.from('github_repos').select('*').eq('selected', true),
    supabase.from('prompts').select('*').order('created_at', { ascending: false })
  ])

  // Extract data with fallbacks
  const profile: Profile = profileRes.status === 'fulfilled' && profileRes.value.data
    ? (() => {
        // social_links tipini kontrol et ve dönüştür
        let socialLinks = { twitter: '', linkedin: '', github: '' }
        if (profileRes.value.data.social_links && typeof profileRes.value.data.social_links === 'object' && !Array.isArray(profileRes.value.data.social_links)) {
          const links = profileRes.value.data.social_links as Record<string, unknown>
          socialLinks = {
            twitter: typeof links.twitter === 'string' ? links.twitter : '',
            linkedin: typeof links.linkedin === 'string' ? links.linkedin : '',
            github: typeof links.github === 'string' ? links.github : ''
          }
        }
        
        // social_links'i çıkarıp spread yap, sonra tekrar ekle
        const { social_links: _, ...profileDataWithoutSocialLinks } = profileRes.value.data
        
        // null değerleri undefined'a dönüştür (Profile tipi undefined bekliyor)
        return {
          id: profileDataWithoutSocialLinks.id,
          name: profileDataWithoutSocialLinks.name,
          title: profileDataWithoutSocialLinks.title,
          subtitle: profileDataWithoutSocialLinks.subtitle,
          present_text: profileDataWithoutSocialLinks.present_text || [],
          social_links: socialLinks,
          github_token: profileDataWithoutSocialLinks.github_token ?? undefined,
          github_username: profileDataWithoutSocialLinks.github_username ?? undefined,
          company: profileDataWithoutSocialLinks.company ?? undefined,
          website_url: profileDataWithoutSocialLinks.website_url ?? undefined,
          location: profileDataWithoutSocialLinks.location ?? undefined,
          job_title: profileDataWithoutSocialLinks.job_title ?? undefined,
          meta_description: profileDataWithoutSocialLinks.meta_description ?? undefined,
          meta_keywords: profileDataWithoutSocialLinks.meta_keywords ?? undefined,
          og_image_url: profileDataWithoutSocialLinks.og_image_url ?? undefined,
          twitter_card_type: profileDataWithoutSocialLinks.twitter_card_type ?? undefined,
          created_at: profileDataWithoutSocialLinks.created_at ?? undefined,
          updated_at: profileDataWithoutSocialLinks.updated_at ?? undefined,
        }
      })()
    : defaultProfile

  const buildingsRaw = buildingsRes.status === 'fulfilled' ? buildingsRes.value.data || [] : []
  // Veritabanından gelen nullable değerleri Building tipine uygun hale getir
  const buildings: Building[] = buildingsRaw.map((building) => ({
    ...building,
    external: building.external ?? false,
    order_index: building.order_index ?? 0,
    url: building.url ?? undefined,
    created_at: building.created_at ?? undefined,
    updated_at: building.updated_at ?? undefined
  }))
  
  // Veritabanından gelen nullable değerleri GithubRepo tipine uygun hale getir
  const reposRaw = reposRes.status === 'fulfilled' ? reposRes.value.data || [] : []
  const selectedRepos: GithubRepo[] = reposRaw.map((repo) => ({
    ...repo,
    description: repo.description ?? undefined,
    selected: repo.selected ?? false,
    created_at: repo.created_at ?? undefined,
    updated_at: repo.updated_at ?? undefined
  }))
  
  // Veritabanından gelen nullable değerleri Prompt tipine uygun hale getir
  const promptsRaw = promptsRes.status === 'fulfilled' ? promptsRes.value.data || [] : []
  const prompts: Prompt[] = promptsRaw.map((prompt) => ({
    ...prompt,
    image_url: prompt.image_url ?? undefined,
    created_at: prompt.created_at ?? undefined,
    updated_at: prompt.updated_at ?? undefined
  }))

  const structuredData = generatePersonStructuredData(profile)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <main className="max-w-[1000px] mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <header className="mb-12 sm:mb-20">
          <div>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8 mb-8 sm:mb-10">
              <div className="relative shrink-0 group cursor-pointer">
                {/* Hover blur overlay on the page */}
                <div className="fixed inset-0 bg-black/5 backdrop-blur-[6px] opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none z-40" />
                <Image
                  src="/hope.png"
                  alt="Umutcan Edizaslan"
                  width={130}
                  height={150}
                  className="relative z-50 w-[90px] sm:w-[120px] h-auto transition-all duration-500 group-hover:brightness-110 group-hover:scale-105 group-hover:drop-shadow-[0_0_25px_rgba(255,255,255,0.7)]"
                />
              </div>
              <div className="text-center sm:text-left flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 mb-3">
                  <h1 className="text-xl sm:text-[24px] font-medium tracking-tight">{profile.name}</h1>
                  <span className="hidden sm:inline text-[24px] text-muted-foreground">~</span>
                  <div className="flex items-center gap-1">
                    <span className="text-lg sm:text-[24px]">{profile.title}</span>
                    <Code2 className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                  </div>
                </div>
                <h2 className="text-base sm:text-[20px] text-muted-foreground font-normal">{profile.subtitle}</h2>
              </div>
            </div>
            <div className="space-y-4 sm:space-y-5 clear-both">
              <h3 className="text-base sm:text-[18px] font-medium">Present</h3>
              {profile.present_text.slice(0, 3).map((text: string, index: number) => (
                <p key={index} className="text-sm sm:text-[16px] text-muted-foreground leading-relaxed">
                  {text}
                </p>
              ))}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12 md:gap-20 border-t border-border/30 pt-8 sm:pt-12 md:pt-20">
          <Section title="Academic Works">
            {buildings.map((building) => (
              <ProjectLink
                key={building.id}
                href="#"
                title={building.title}
                description={building.description}
                external={building.external}
              />
            ))}
          </Section>

          <Section title="Open Source">
            <div className="space-y-6">
              {selectedRepos.map((repo, index) => (
                <div key={repo.id} className="group relative">
                  {/* Timeline Line - Sade çizgi */}
                  <div className="absolute left-2 top-0 bottom-0 w-px bg-border"></div>

                  {/* Timeline Dot - Siyah nokta */}
                  <div className="absolute left-[6px] top-4 w-2 h-2 bg-foreground rounded-full border-2 border-background shadow-sm z-10"></div>

                  {/* Content */}
                  <div className="ml-8">
                    <Card className="border-0 shadow-none bg-transparent p-0">
                      <CardContent className="p-0">
                        <Link
                          href={repo.repo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block group/card hover:bg-muted/30 p-3 -m-3 rounded-lg transition-colors duration-200"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-foreground group-hover/card:text-foreground/80 transition-colors">
                                {repo.repo_name}
                              </h4>
                              {repo.description && (
                                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                  {truncateDescription(repo.description, 150)}
                                </p>
                              )}
                            </div>
                            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover/card:text-foreground transition-colors shrink-0 mt-0.5" />
                          </div>
                        </Link>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Explore">
            <ProjectLink
              href="/blog"
              title="Writing"
              description="Thoughts on technology, design, and life"
              icon={<PenLine className="w-4 h-4" />}
            />
            <ProjectLink
              href="/prompts"
              title="Prompts"
              description="Collection of useful AI prompts"
              icon={<Sparkles className="w-4 h-4" />}
            />
            {prompts[0] && (
                <div className="glass-prompt-glow glass-shimmer rounded-2xl p-6 sm:p-7 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[1px] gradient-line-top" />
                  <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-sky-300/30 dark:bg-sky-400/15 blur-2xl animate-float pointer-events-none" />
                  <div className="absolute -bottom-6 -left-6 w-36 h-36 rounded-full bg-violet-300/25 dark:bg-violet-400/12 blur-2xl animate-float-delayed pointer-events-none" />
                  <div className="relative z-[2]">
                    <div className="flex justify-between items-start gap-4 mb-4">
                      <div>
                        <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/50 font-medium mb-2 flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3" />
                          Featured Prompt
                        </span>
                        <h4 className="font-semibold text-base leading-snug">{prompts[0].title}</h4>
                      </div>
                      <CopyButton content={prompts[0].content} />
                    </div>
                    <p className="text-sm text-muted-foreground/80 leading-relaxed line-clamp-4">
                      {prompts[0].content}
                    </p>
                  </div>
                </div>
              )}
            <ProjectLink
              href="/tools"
              title="Tools"
              description="Useful development and productivity tools"
              icon={<Wrench className="w-4 h-4" />}
            />
            <div>
              <h4 className="font-medium mb-3 text-xs uppercase tracking-[0.1em] text-muted-foreground/60">Connect</h4>
              <div className="flex items-center gap-2 sm:gap-3">
                {profile.social_links?.twitter && (
                  <>
                    <Link
                      href={profile.social_links.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="glass-circle w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground"
                      aria-label="Twitter"
                    >
                      <Twitter className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                    </Link>
                                      </>
                )}
                {profile.social_links?.linkedin && (
                  <>
                    <Link
                      href={profile.social_links.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="glass-circle w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground"
                      aria-label="LinkedIn"
                    >
                      <Linkedin className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                    </Link>
                                      </>
                )}
                {profile.social_links?.github && (
                  <Link
                    href={profile.social_links.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="glass-circle w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground"
                    aria-label="GitHub"
                  >
                    <Github className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                  </Link>
                )}
              </div>
            </div>
          </Section>
        </div>
      </main>

    </>
  )
}

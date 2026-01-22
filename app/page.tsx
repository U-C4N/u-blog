import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Code2, Twitter, Linkedin, Github, Copy, Check, ExternalLink, Star } from 'lucide-react'
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
export const revalidate = 3600 // Revalidate every hour

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
  const selectedRepos = reposRes.status === 'fulfilled' ? reposRes.value.data || [] : []
  const prompts = promptsRes.status === 'fulfilled' ? promptsRes.value.data || [] : []

  const structuredData = generatePersonStructuredData(profile)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <main className="max-w-[1000px] mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <header className="mb-12 sm:mb-20">
          {/* Mobile: Stacked layout, Desktop: Float layout */}
          <div className="block sm:flow-root">
            <div className="flex flex-col sm:block">
              <Image
                src="/hope.png"
                alt="Umutcan Edizaslan"
                width={140}
                height={140}
                className="rounded-lg mx-auto sm:float-right sm:ml-6 mb-6 w-24 h-24 sm:w-[140px] sm:h-[140px]"
              />
              <div className="text-center sm:text-left">
                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 mb-3">
                  <h1 className="text-xl sm:text-[24px] font-medium tracking-tight">{profile.name}</h1>
                  <span className="hidden sm:inline text-[24px] text-muted-foreground">~</span>
                  <div className="flex items-center gap-1">
                    <span className="text-lg sm:text-[24px]">{profile.title}</span>
                    <Code2 className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                  </div>
                </div>
                <h2 className="text-base sm:text-[20px] text-muted-foreground font-normal mb-6 sm:mb-10">{profile.subtitle}</h2>
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
              <div key={building.id} className="hover:bg-muted/30 p-3 -m-3 rounded-lg transition-colors duration-200">
                <ProjectLink
                  href="#"
                  title={building.title}
                  description={building.description}
                  external={building.external}
                />
              </div>
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
            <div className="hover:bg-muted/30 p-3 -m-3 rounded-lg transition-colors duration-200">
              <ProjectLink
                href="/blog"
                title="Writing"
                description="Thoughts on technology, design, and life"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="hover:bg-muted/30 p-3 -m-3 rounded-lg transition-colors duration-200">
                  <ProjectLink
                    href="/prompts"
                    title="Prompts"
                    description="Collection of useful AI prompts"
                  />
                </div>
              </div>
              {prompts[0] && (
                <div className="bg-muted/20 p-5 rounded-lg border border-border/40 hover:bg-muted/30 transition-colors duration-200">
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <h4 className="font-medium text-sm">{prompts[0].title}</h4>
                    <CopyButton content={prompts[0].content} />
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {prompts[0].content}
                  </p>
                </div>
              )}
              <div className="hover:bg-muted/30 p-3 -m-3 rounded-lg transition-colors duration-200 mt-4">
                <ProjectLink
                  href="/tools"
                  title="Tools"
                  description="Useful development and productivity tools"
                />
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-3 text-sm sm:text-[16px]">Social Media</h4>
              <div className="flex items-center gap-2 sm:gap-3">
                {profile.social_links?.twitter && (
                  <>
                    <Link
                      href={profile.social_links.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors p-1 hover:bg-muted/30 rounded"
                      aria-label="Twitter"
                    >
                      <Twitter className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                    </Link>
                    <span className="text-muted-foreground/60">,</span>
                  </>
                )}
                {profile.social_links?.linkedin && (
                  <>
                    <Link
                      href={profile.social_links.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors p-1 hover:bg-muted/30 rounded"
                      aria-label="LinkedIn"
                    >
                      <Linkedin className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                    </Link>
                    <span className="text-muted-foreground/60">,</span>
                  </>
                )}
                {profile.social_links?.github && (
                  <Link
                    href={profile.social_links.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors p-1 hover:bg-muted/30 rounded"
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

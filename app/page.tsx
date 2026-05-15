import type { Metadata } from 'next'
import { supabase, type Profile, type Building, type GithubRepo, type Prompt } from '@/lib/supabase/config'
import { siteUrl } from '@/lib/site'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Hero } from '@/components/site/hero'
import { PresentBlock } from '@/components/site/present-block'
import { AcademicWorksList, type AcademicItem } from '@/components/site/academic-works-list'
import { OpenSourceCard } from '@/components/site/open-source-card'
import { ExploreList } from '@/components/site/explore-list'
import { Github } from 'lucide-react'

// Dynamic metadata generation
export async function generateMetadata(): Promise<Metadata> {
  const profileRes = await supabase.from('profiles').select('*').limit(1).maybeSingle()
  const profile = profileRes.data || {
    name: 'Umutcan Edizaslan',
    subtitle: 'Mechanical Engineer ~ Machine Learning Enthusiast',
    meta_description: 'Mechanical Engineer and Machine Learning Enthusiast. Personal website and blog.',
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
      url: siteUrl,
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

export const revalidate = 60

function generatePersonStructuredData(profile: Profile) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.name,
    jobTitle: profile.subtitle,
    url: siteUrl,
    sameAs: [
      profile.social_links?.github,
      profile.social_links?.twitter,
      profile.social_links?.linkedin,
    ].filter(Boolean),
  }
}

const defaultProfile: Profile = {
  id: '00000000-0000-0000-0000-000000000000',
  name: 'Umutcan Edizaslan',
  title: 'Mr.Creator',
  subtitle: 'Mechanical Engineer ~ Machine Learning Enthusiast',
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

const FALLBACK_CONTACT_EMAIL = 'contact@uc4n.com'

export default async function Home() {
  const [profileRes, buildingsRes, reposRes, _promptsRes] = await Promise.allSettled([
    supabase.from('profiles').select('*').limit(1).maybeSingle(),
    supabase.from('buildings').select('*').order('order_index'),
    supabase.from('github_repos').select('*').eq('selected', true),
    supabase.from('prompts').select('*').order('created_at', { ascending: false })
  ])

  const profile: Profile = profileRes.status === 'fulfilled' && profileRes.value.data
    ? (() => {
        let socialLinks: { twitter: string; linkedin: string; github: string; email?: string } = {
          twitter: '',
          linkedin: '',
          github: '',
        }
        if (
          profileRes.value.data.social_links &&
          typeof profileRes.value.data.social_links === 'object' &&
          !Array.isArray(profileRes.value.data.social_links)
        ) {
          const links = profileRes.value.data.social_links as Record<string, unknown>
          socialLinks = {
            twitter: typeof links.twitter === 'string' ? links.twitter : '',
            linkedin: typeof links.linkedin === 'string' ? links.linkedin : '',
            github: typeof links.github === 'string' ? links.github : '',
            email: typeof links.email === 'string' ? links.email : undefined,
          }
        }

        const { social_links: _, ...rest } = profileRes.value.data

        return {
          id: rest.id,
          name: rest.name,
          title: rest.title,
          subtitle: rest.subtitle,
          present_text: rest.present_text || [],
          social_links: socialLinks,
          github_token: rest.github_token ?? undefined,
          github_username: rest.github_username ?? undefined,
          company: rest.company ?? undefined,
          website_url: rest.website_url ?? undefined,
          location: rest.location ?? undefined,
          job_title: rest.job_title ?? undefined,
          meta_description: rest.meta_description ?? undefined,
          meta_keywords: rest.meta_keywords ?? undefined,
          og_image_url: rest.og_image_url ?? undefined,
          twitter_card_type: rest.twitter_card_type ?? undefined,
          created_at: rest.created_at ?? undefined,
          updated_at: rest.updated_at ?? undefined,
        }
      })()
    : defaultProfile

  const buildingsRaw = buildingsRes.status === 'fulfilled' ? buildingsRes.value.data || [] : []
  const buildings: Building[] = buildingsRaw.map((b) => ({
    ...b,
    external: b.external ?? false,
    order_index: b.order_index ?? 0,
    url: b.url ?? undefined,
    created_at: b.created_at ?? undefined,
    updated_at: b.updated_at ?? undefined,
  }))

  const reposRaw = reposRes.status === 'fulfilled' ? reposRes.value.data || [] : []
  const selectedRepos: GithubRepo[] = reposRaw.map((r) => ({
    ...r,
    description: r.description ?? undefined,
    selected: r.selected ?? false,
    created_at: r.created_at ?? undefined,
    updated_at: r.updated_at ?? undefined,
  }))

  const structuredData = generatePersonStructuredData(profile)
  const contactEmail = (profile.social_links as { email?: string } | undefined)?.email || FALLBACK_CONTACT_EMAIL

  const presentParagraphs: string[] = profile.present_text

  function inferYear(b: Building, index: number): number {
    if (b.created_at) {
      const y = new Date(b.created_at).getFullYear()
      if (!Number.isNaN(y)) return y
    }
    return 2024 - index
  }

  const ACADEMIC_FALLBACK: AcademicItem[] = [
    { title: 'Design and Analysis of a 5-Axis CNC Machine', year: 2024 },
    { title: 'Thermal Optimization of Heat Exchangers', year: 2023 },
    { title: 'Dynamic Modeling and Control of Robotic Arms', year: 2022 },
    { title: 'Finite Element Analysis of Composite Structures', year: 2021 },
    { title: 'Design Optimization of a Formula Student Chassis', year: 2020 },
    { title: 'A Study on Additive Manufacturing Tolerances', year: 2019 },
  ]

  const academicItems: AcademicItem[] = buildings.length > 0
    ? buildings.map((b, i) => ({
        title: b.title,
        year: inferYear(b, i),
        href: b.url,
        external: b.external,
      }))
    : ACADEMIC_FALLBACK

  const REPO_FALLBACK: GithubRepo[] = [
    { id: 'mock-1', repo_name: 'u-blog', repo_url: 'https://github.com', description: 'A clean, fast and minimal blog platform.', selected: true },
    { id: 'mock-2', repo_name: 'U-transkript', repo_url: 'https://github.com', description: 'Transcribe audio to text with precision.', selected: true },
    { id: 'mock-3', repo_name: 'Umap', repo_url: 'https://github.com', description: 'Minimal open-source mapping platform.', selected: true },
    { id: 'mock-4', repo_name: 'u-tools', repo_url: 'https://github.com', description: 'A collection of handy developer utilities.', selected: true },
  ]

  const repos = selectedRepos.length > 0 ? selectedRepos.slice(0, 4) : REPO_FALLBACK
  const STAR_MOCKS: Record<string, number> = {
    'u-blog': 17,
    'U-transkript': 13,
    'Umap': 15,
    'u-tools': 9,
  }
  const githubUrl = profile.social_links?.github || 'https://github.com'

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Full-page marble background scoped to homepage (fixed — visible behind every section) */}
      <div
        aria-hidden
        className="fixed inset-0 -z-20"
        style={{
          backgroundImage: "url('/bg.webp')",
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
          backgroundColor: 'hsl(var(--cream))',
        }}
      />

      {/* Bust-hover blur veil at page root (escapes any transformed ancestors) */}
      <div
        className="bust-veil fixed inset-0 z-[45] opacity-0 pointer-events-none transition-opacity duration-500"
        style={{
          backdropFilter: 'blur(12px) saturate(1.05)',
          WebkitBackdropFilter: 'blur(12px) saturate(1.05)',
          backgroundColor: 'rgba(31, 27, 23, 0.04)',
        }}
        aria-hidden
      />

      <SiteNav contactEmail={contactEmail} />

      <main className="relative classical-ink">
        <Hero profile={profile} />

        {/* Below-hero white section — pure white, separates from cream marble hero */}
        <div className="relative bg-white border-t border-[hsl(var(--ink)/0.06)]">
          <div className="max-w-6xl mx-auto px-6 py-12 lg:py-16">
            {/* Section A: PRESENT + ACADEMIC WORKS — 2 cols with vertical center divider */}
            <section
              id="academic"
              className="relative grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16 classical-fade-up"
            >
              {/* Vertical center divider with gold dot (desktop only) */}
              <div
                aria-hidden
                className="hidden md:block absolute left-1/2 -translate-x-1/2 top-2 bottom-2 w-px"
                style={{ backgroundColor: 'hsl(var(--ink) / 0.08)' }}
              >
                <span
                  className="absolute left-1/2 -translate-x-1/2 top-1/3 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: 'hsl(var(--gold))' }}
                />
              </div>

              <PresentBlock
                title="PRESENT"
                paragraphs={presentParagraphs}
                emptyHint="Currently composing the next chapter."
              />
              <AcademicWorksList
                title="ACADEMIC WORKS"
                items={academicItems}
                emptyHint="Studies and papers in progress."
              />
            </section>

            {/* Section B: GITHUB PROJECTS + EXPLORE — 2 cols, each holds a 4-col mini-grid */}
            <section
              id="open-source"
              className="mt-12 lg:mt-16 pt-10 lg:pt-12 border-t border-[hsl(var(--ink)/0.06)] grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16"
            >
              <div>
                <header className="flex items-center justify-between gap-3 mb-2">
                  <h2 className="serif-display text-[13px] tracking-[0.4em] uppercase classical-ink">
                    GITHUB PROJECTS
                  </h2>
                  <a
                    href={githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="classical-sans text-[11px] tracking-[0.25em] uppercase classical-ink-muted hover:gold-text transition-colors inline-flex items-center gap-1.5"
                  >
                    View Github
                    <Github className="w-3.5 h-3.5" strokeWidth={1.6} />
                  </a>
                </header>
                <span className="block gold-divider w-20 mb-5" />
                {repos.length === 0 ? (
                  <p className="serif-body italic text-sm classical-ink-muted">
                    Projects forthcoming. Check back soon.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {repos.map((repo) => (
                      <OpenSourceCard key={repo.id} repo={repo} stars={STAR_MOCKS[repo.repo_name]} />
                    ))}
                  </div>
                )}
              </div>
              <div id="explore">
                <ExploreList />
              </div>
            </section>
          </div>
        </div>

        <SiteFooter
          social={profile.social_links as { twitter?: string; linkedin?: string; github?: string; email?: string } | undefined}
          contactEmail={contactEmail}
          ownerName={profile.name}
          initial={profile.name?.[0] ?? 'U'}
        />
      </main>
    </>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'
import { Code2, Twitter, Linkedin, Github, Copy, Check } from 'lucide-react'
import { ProjectLink } from '@/components/project-link'
import { Section } from '@/components/section'
import { supabase, type Profile, type Building, type GithubRepo, type Prompt } from '@/lib/supabase/config'
import { Button } from '@/components/ui/button'
import { env } from '@/env.mjs'

// Metadata for the homepage
export const metadata: Metadata = {
  openGraph: {
    type: 'website',
    url: env.NEXT_PUBLIC_SITE_URL,
    title: 'U-BLOG | Umutcan Edizaslan',
    description: 'Software Engineer and AI Master\'s Student. Personal website and blog.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'U-BLOG | Umutcan Edizaslan',
    description: 'Software Engineer and AI Master\'s Student. Personal website and blog.',
  },
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
  const profile = profileRes.status === 'fulfilled' && profileRes.value.data
    ? {
        ...profileRes.value.data,
        social_links: {
          twitter: profileRes.value.data.social_links?.twitter || '',
          linkedin: profileRes.value.data.social_links?.linkedin || '',
          github: profileRes.value.data.social_links?.github || ''
        }
      }
    : defaultProfile

  const buildings = buildingsRes.status === 'fulfilled' ? buildingsRes.value.data || [] : []
  const selectedRepos = reposRes.status === 'fulfilled' ? reposRes.value.data || [] : []
  const prompts = promptsRes.status === 'fulfilled' ? promptsRes.value.data || [] : []

  const structuredData = generatePersonStructuredData(profile)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <main className="max-w-[1000px] mx-auto px-6 py-20">
        <header className="mb-20">
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-[24px] font-medium tracking-tight">{profile.name}</h1>
            <span className="text-[24px] text-muted-foreground">~</span>
            <div className="flex items-center gap-1">
              <span className="text-[24px]">{profile.title}</span>
              <Code2 className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>
          <h2 className="text-[20px] text-muted-foreground mb-10 font-normal">{profile.subtitle}</h2>
          
          <div className="space-y-5">
            <h3 className="text-[18px] font-medium">Present</h3>
            {profile.present_text.slice(0, 3).map((text: string, index: number) => (
              <p key={index} className="text-[16px] text-muted-foreground leading-relaxed">
                {text}
              </p>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-20 border-t border-border/30 pt-20">
          <Section title="Portfolio">
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
            {selectedRepos.map((repo) => (
              <div key={repo.id} className="hover:bg-muted/30 p-3 -m-3 rounded-lg transition-colors duration-200">
                <ProjectLink
                  href={repo.repo_url}
                  title={repo.repo_name}
                  description={truncateDescription(repo.description || '')}
                  external
                />
              </div>
            ))}
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 hover:bg-muted/50 transition-colors"
                      type="button"
                      id="copy-prompt-button"
                    >
                      <Copy className="w-4 h-4" />
                      <span className="sr-only">Copy</span>
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {prompts[0].content}
                  </p>
                </div>
              )}
            </div>
            <div>
              <h4 className="font-medium mb-3 text-[16px]">Social Media</h4>
              <div className="flex items-center gap-3">
                {profile.social_links?.twitter && (
                  <>
                    <Link 
                      href={profile.social_links.twitter}
                      target="_blank"
                      rel="noopener noreferrer" 
                      className="text-muted-foreground hover:text-foreground transition-colors p-1 hover:bg-muted/30 rounded"
                      aria-label="Twitter"
                    >
                      <Twitter className="w-[18px] h-[18px]" />
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
                      <Linkedin className="w-[18px] h-[18px]" />
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
                    <Github className="w-[18px] h-[18px]" />
                  </Link>
                )}
              </div>
            </div>
          </Section>
        </div>
      </main>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.getElementById('copy-prompt-button')?.addEventListener('click', async () => {
              try {
                await navigator.clipboard.writeText(${JSON.stringify(prompts[0]?.content || '')});
                const btn = document.getElementById('copy-prompt-button');
                const originalContent = btn.innerHTML;
                btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-green-500"><polyline points="20 6 9 17 4 12"></polyline></svg><span class="sr-only">Copied</span>';
                setTimeout(() => {
                  btn.innerHTML = originalContent;
                }, 2000);
              } catch (err) {
                console.error('Failed to copy:', err);
              }
            });
          `
        }}
      />
    </>
  )
}
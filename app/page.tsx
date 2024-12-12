'use client'

import { useEffect, useState } from 'react'
import { Code2, Twitter, Linkedin, Github } from 'lucide-react'
import Link from 'next/link'
import { ProjectLink } from '@/components/project-link'
import { Section } from '@/components/section'
import { supabase, type Profile, type Building, type GithubRepo } from '@/lib/supabase/config'

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

// Açıklama metnini kısaltmak için yardımcı fonksiyon
function truncateDescription(description: string, maxLength: number = 150): string {
  if (!description) return '';
  if (description.length <= maxLength) return description;
  return description.slice(0, maxLength).trim() + '...';
}

export default function Home() {
  const [profile, setProfile] = useState<Profile>(defaultProfile)
  const [buildings, setBuildings] = useState<Building[]>([])
  const [selectedRepos, setSelectedRepos] = useState<GithubRepo[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        console.log('Fetching homepage data...');
        
        const [profileRes, buildingsRes, reposRes] = await Promise.all([
          supabase.from('profiles').select('*').limit(1).maybeSingle(),
          supabase.from('buildings').select('*').order('order_index'),
          supabase.from('github_repos').select('*').eq('selected', true)
        ])

        console.log('Profile response:', profileRes);

        if (profileRes.data) {
          // Ensure social_links exists and is properly structured
          const profileData = {
            ...profileRes.data,
            social_links: {
              twitter: profileRes.data.social_links?.twitter || '',
              linkedin: profileRes.data.social_links?.linkedin || '',
              github: profileRes.data.social_links?.github || ''
            }
          }
          console.log('Setting profile data:', profileData);
          setProfile(profileData)
        }

        if (buildingsRes.data) {
          setBuildings(buildingsRes.data)
        }

        if (reposRes.data) {
          setSelectedRepos(reposRes.data)
        }
      } catch (err) {
        console.error('Error fetching homepage data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()

    // Refresh data every 30 seconds instead of 5
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  if (isLoading) {
    return (
      <main className="max-w-[1000px] mx-auto px-6 py-16">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-[1000px] mx-auto px-6 py-16">
      <header className="mb-16">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-[22px] font-medium tracking-tight">{profile.name}</h1>
          <span className="text-[22px] text-muted-foreground">~</span>
          <div className="flex items-center gap-1">
            <span className="text-[22px]">{profile.title}</span>
            <Code2 className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
        <h2 className="text-[19px] text-muted-foreground mb-8 font-normal">{profile.subtitle}</h2>
        
        <div className="space-y-4">
          <h3 className="text-[17px] font-medium">Present</h3>
          {profile.present_text.slice(0, 3).map((text, index) => (
            <p key={index} className="text-[15px] text-muted-foreground leading-relaxed">
              {text}
            </p>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
        <Section title="Building">
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
          {selectedRepos.map((repo) => (
            <ProjectLink
              key={repo.id}
              href={repo.repo_url}
              title={repo.repo_name}
              description={truncateDescription(repo.description || '')}
              external
            />
          ))}
        </Section>

        <Section title="Explore">
          <ProjectLink
            href="/blog"
            title="Writing"
            description="Thoughts on technology, design, and life"
          />
          <div>
            <h4 className="font-medium mb-2 text-[15px]">Social Media</h4>
            <div className="flex items-center gap-2">
              {profile.social_links?.twitter && (
                <>
                  <Link 
                    href={profile.social_links.twitter}
                    target="_blank"
                    rel="noopener noreferrer" 
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Twitter className="w-[18px] h-[18px]" />
                  </Link>
                  <span className="text-muted-foreground">,</span>
                </>
              )}
              {profile.social_links?.linkedin && (
                <>
                  <Link 
                    href={profile.social_links.linkedin}
                    target="_blank"
                    rel="noopener noreferrer" 
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Linkedin className="w-[18px] h-[18px]" />
                  </Link>
                  <span className="text-muted-foreground">,</span>
                </>
              )}
              {profile.social_links?.github && (
                <Link 
                  href={profile.social_links.github}
                  target="_blank"
                  rel="noopener noreferrer" 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Github className="w-[18px] h-[18px]" />
                </Link>
              )}
            </div>
          </div>
        </Section>
      </div>
    </main>
  )
}
'use client'

import { useEffect, useState } from 'react'
import { Code2, Twitter, Linkedin, Github } from 'lucide-react'
import Link from 'next/link'
import { ProjectLink } from '@/components/project-link'
import { Section } from '@/components/section'
import { supabase, type Profile } from '@/lib/supabase/config'

const defaultProfile: Profile = {
  id: crypto.randomUUID(),
  name: 'Railly Hugo',
  title: 'Hunter',
  subtitle: 'Software Engineer ~ AI Master\'s Student',
  present_text: [
    'I work as a full-stack engineer at Globant, contributing to Disney O&I Engineering Team.',
    'I like to build developer tools for myself and make them open source for the community.'
  ]
}

export default function Home() {
  const [profile, setProfile] = useState<Profile>(defaultProfile)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchProfile() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .limit(1)
          .maybeSingle()

        if (error) {
          console.error('Error fetching profile:', error)
          return // Keep using default profile
        }

        if (data) {
          setProfile(data)
        }
      } catch (err) {
        console.error('Error fetching profile:', err)
        // Keep using default profile
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
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
          {profile.present_text.map((text, index) => (
            <p key={index} className="text-[15px] text-muted-foreground leading-relaxed">
              {text}
            </p>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
        <Section title="Building">
          <ProjectLink
            href="#"
            title="Logit"
            description="Documenting my Low Level + Math Journey"
          />
          <ProjectLink
            href="#"
            title="Crafter Station"
            description="Digital lab for crafting new ideas and projects"
            external
          />
          <ProjectLink
            href="#"
            title="Tinte"
            description="An opinionated VS Code theme generator"
            external
          />
        </Section>

        <Section title="Open Source">
          <ProjectLink
            href="#"
            title="One Hunter Theme"
            description="VS Code theme inspired by Vercel and Flexoki"
            external
          />
          <ProjectLink
            href="#"
            title="shadcn/ui customizer"
            description="Tune your shadcn/ui themes with color pickers"
            external
          />
          <ProjectLink
            href="#"
            title="Obsidian Simple Flashcards"
            description="Turn fenced code blocks into flashcards in Obsidian"
            external
          />
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
              <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Twitter className="w-[18px] h-[18px]" />
              </Link>
              <span className="text-muted-foreground">,</span>
              <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Linkedin className="w-[18px] h-[18px]" />
              </Link>
              <span className="text-muted-foreground">,</span>
              <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Github className="w-[18px] h-[18px]" />
              </Link>
            </div>
          </div>
        </Section>
      </div>
    </main>
  )
}
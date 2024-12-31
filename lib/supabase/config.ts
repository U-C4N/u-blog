import { createClient } from '@supabase/supabase-js'

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Server-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Client-side Supabase client
export const getSupabaseBrowser = () => {
  return createClient(
    // These are safe to use on the client as they are prefixed with NEXT_PUBLIC
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true
      }
    }
  )
}

// Types
export type Profile = {
  id: string
  name: string
  title: string
  subtitle: string
  present_text: string[]
  social_links?: {
    twitter?: string
    linkedin?: string
    github?: string
  }
  github_token?: string
  github_username?: string
  created_at?: string
  updated_at?: string
}

export type Post = {
  id: string
  title: string
  slug: string
  content: string
  published: boolean
  created_at: string
  updated_at: string
}

export type Project = {
  id: string
  label: string
  url: string
  description: string
  order_index: number
  created_at?: string
  updated_at?: string
}

export type Building = {
  id: string
  title: string
  description: string
  external: boolean
  url?: string
  order_index: number
  created_at?: string
  updated_at?: string
}

export type GithubRepo = {
  id: string
  repo_name: string
  repo_url: string
  description?: string
  selected: boolean
  created_at?: string
  updated_at?: string
}
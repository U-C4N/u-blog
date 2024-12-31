import { createClient } from '@supabase/supabase-js'

// Use public environment variables for client-side
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
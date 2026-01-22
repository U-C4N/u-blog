import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from './database.types'

// These are safe to use on the client as they are prefixed with NEXT_PUBLIC
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Server-side Supabase client (for API routes and server components)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
})

// Client-side Supabase client singleton (cached to avoid recreation)
let browserClient: SupabaseClient<Database> | null = null

export const getSupabaseBrowser = (): SupabaseClient<Database> => {
  if (typeof window === 'undefined') {
    throw new Error('getSupabaseBrowser can only be called in the browser')
  }

  // Return cached client if exists (prevents recreation on every call)
  if (browserClient) {
    return browserClient
  }

  browserClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      storageKey: 'supabase.auth.token',
      storage: window.localStorage
    }
  })

  return browserClient
}

// Initialize required storage buckets - Disabled since buckets already exist
export const initStorageBuckets = async () => {
  // Buckets already exist in the database, no need to recreate them
  console.log('Storage buckets (blog-images, blog-audio) already configured');
};

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
  meta_description?: string
  meta_keywords?: string[]
  og_image_url?: string
  twitter_card_type?: string
  website_url?: string
  location?: string
  company?: string
  job_title?: string
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
  tags?: string[]
  views?: number
  meta_title?: string
  meta_description?: string
  canonical_url?: string
  og_image_url?: string
  noindex?: boolean
  language_code?: string
  translations?: { [key: string]: { title: string; content: string; slug: string } }
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

export type Prompt = {
  id: string
  title: string
  content: string
  image_url?: string | null
  created_at?: string
  updated_at?: string
}

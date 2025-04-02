import { createClient } from '@supabase/supabase-js'

// These are safe to use on the client as they are prefixed with NEXT_PUBLIC
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Server-side Supabase client (for API routes and server components)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
})

// Client-side Supabase client (for client components)
export const getSupabaseBrowser = () => {
  if (typeof window === 'undefined') {
    throw new Error('getSupabaseBrowser can only be called in the browser')
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      storageKey: 'supabase.auth.token',
      storage: window.localStorage
    }
  })
}

// Initialize required storage buckets
export const initStorageBuckets = async () => {
  try {
    const client = supabase;
    
    // Check if blog-audio bucket exists
    const { data: buckets, error: listError } = await client.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return;
    }
    
    // Create blog-audio bucket if it doesn't exist
    if (!buckets.find(bucket => bucket.name === 'blog-audio')) {
      const { error: createError } = await client.storage.createBucket('blog-audio', {
        public: true,
        fileSizeLimit: 20971520 // 20MB in bytes
      });
      
      if (createError) {
        console.error('Error creating blog-audio bucket:', createError);
      } else {
        console.log('Created blog-audio bucket successfully');
      }
    }
    
    // Ensure blog-images bucket exists too
    if (!buckets.find(bucket => bucket.name === 'blog-images')) {
      const { error: createError } = await client.storage.createBucket('blog-images', {
        public: true,
        fileSizeLimit: 5242880 // 5MB in bytes
      });
      
      if (createError) {
        console.error('Error creating blog-images bucket:', createError);
      } else {
        console.log('Created blog-images bucket successfully');
      }
    }
  } catch (error) {
    console.error('Storage bucket initialization error:', error);
  }
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

export type Prompt = {
  id: string
  title: string
  content: string
  created_at?: string
  updated_at?: string
}
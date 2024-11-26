import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public'
  }
})

export type Profile = {
  id: string
  name: string
  title: string
  subtitle: string
  present_text: string[]
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
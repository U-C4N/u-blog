import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

let browserClient: SupabaseClient<Database> | null = null

export function createClient(): SupabaseClient<Database> {
  if (typeof window === 'undefined') {
    throw new Error('createClient (browser) can only be called in the browser')
  }
  if (browserClient) return browserClient
  browserClient = createBrowserClient<Database>(supabaseUrl!, supabaseAnonKey!)
  return browserClient
}

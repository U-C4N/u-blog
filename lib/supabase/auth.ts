import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from './server'
import type { User } from '@supabase/supabase-js'

export const getAdminSession = cache(async () => {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { user: null as User | null, supabase }
  return { user, supabase }
})

export async function requireAdmin() {
  const { user, supabase } = await getAdminSession()
  if (!user) redirect('/adminos/login')
  return { user, supabase }
}

export async function verifyBearerAdmin(authHeader: string | null): Promise<User | null> {
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7).trim()
  if (!token) return null

  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user
}

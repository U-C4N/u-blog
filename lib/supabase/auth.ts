import { supabase } from './config'

export async function signIn(email: string, password: string) {
  // @ts-ignore - Ignore type error due to Supabase version mismatch
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export async function signOut() {
  // @ts-ignore - Ignore type error due to Supabase version mismatch
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function getSession() {
  // @ts-ignore - Ignore type error due to Supabase version mismatch
  const { data: { session }, error } = await supabase.auth.getSession()
  return { session, error }
}
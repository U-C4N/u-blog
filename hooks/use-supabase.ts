'use client'

import { useEffect, useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase/config'

type UserData = {
  id: string
  email?: string
  [key: string]: any
}

export function useSupabaseAuth() {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Use the browser client for auth
    const supabase = getSupabaseBrowser()
    
    // Check for existing session
    const checkSession = async () => {
      try {
        // @ts-ignore - Ignore type errors due to version mismatch
        const { data } = await supabase.auth.getSession()
        setUser(data?.session?.user ?? null)
        setLoading(false)
      } catch (error) {
        console.error('Error checking session:', error)
        setLoading(false)
      }
    }
    
    checkSession()

    // Set up a listener for auth changes
    try {
      // @ts-ignore - Ignore type errors due to version mismatch
      const authListener = supabase.auth.onAuthStateChange((_event: any, session: any) => {
        setUser(session?.user ?? null)
      })

      return () => {
        if (authListener?.data?.subscription?.unsubscribe) {
          authListener.data.subscription.unsubscribe()
        }
      }
    } catch (error) {
      console.error('Error setting up auth listener:', error)
      return () => {}
    }
  }, [])

  return { user, loading }
}
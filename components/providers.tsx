'use client'

import { ReactNode, useEffect } from 'react'
import { ErrorBoundary } from './error-boundary'
import { initStorageBuckets } from '@/lib/supabase/config'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  useEffect(() => {
    // Initialize storage buckets on client side
    const initStorage = async () => {
      await initStorageBuckets();
    };
    
    initStorage();
  }, []);

  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  )
}
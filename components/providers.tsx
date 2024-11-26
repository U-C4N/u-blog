'use client'

import { ReactNode } from 'react'
import { ErrorBoundary } from './error-boundary'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  )
}
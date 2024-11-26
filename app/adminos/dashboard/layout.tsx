'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('adminAuth')
    if (!isAuthenticated) {
      router.push('/adminos/login')
    }
  }, [router])

  return children
}
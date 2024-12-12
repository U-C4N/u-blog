'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/config'

export default function NewBuildingPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const building = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      external: formData.get('external') === 'true',
      order_index: parseInt(formData.get('order_index') as string) || 0
    }

    try {
      const { error } = await supabase
        .from('buildings')
        .insert(building)

      if (error) throw error
      router.push('/adminos/dashboard/buildings')
      router.refresh()
    } catch (err: any) {
      console.error('Error creating building:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="max-w-[1000px] mx-auto px-6 py-16">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/adminos/dashboard/buildings"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Buildings
        </Link>
        <h1 className="text-2xl font-bold">New Building</h1>
      </div>

      <div className="max-w-2xl">
        {error && (
          <div className="flex items-center gap-2 p-4 mb-6 text-sm text-destructive bg-destructive/10 rounded-md">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-muted-foreground mb-2">
              Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-muted-foreground mb-2">
              Description
            </label>
            <input
              type="text"
              id="description"
              name="description"
              className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          <div>
            <label htmlFor="order_index" className="block text-sm font-medium text-muted-foreground mb-2">
              Order Index
            </label>
            <input
              type="number"
              id="order_index"
              name="order_index"
              min="0"
              className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              External Link?
            </label>
            <div className="space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="external"
                  value="true"
                  className="mr-2"
                />
                Yes
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="external"
                  value="false"
                  className="mr-2"
                  defaultChecked
                />
                No
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Link
              href="/adminos/dashboard/buildings"
              className="px-4 py-2 border rounded-md hover:bg-muted transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isLoading ? 'Saving...' : 'Save Building'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
} 
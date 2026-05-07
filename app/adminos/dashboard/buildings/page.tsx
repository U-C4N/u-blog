'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Building } from '@/lib/supabase/config'

export default function BuildingsPage() {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchBuildings()
  }, [])

  async function fetchBuildings() {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .order('order_index')

      if (error) throw error
      
      // Veritabanından gelen nullable değerleri Building tipine uygun hale getir
      const transformedBuildings: Building[] = (data || []).map((building) => ({
        ...building,
        external: building.external ?? false,
        order_index: building.order_index ?? 0,
        url: building.url ?? undefined,
        created_at: building.created_at ?? undefined,
        updated_at: building.updated_at ?? undefined
      }))
      
      setBuildings(transformedBuildings)
    } catch (err: any) {
      console.error('Error fetching buildings:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (deletingId) return
    if (!confirm('Delete this building?')) return
    setDeletingId(id)
    setError(null)
    const previous = buildings
    setBuildings((prev) => prev.filter((b) => b.id !== id))
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('buildings')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (err: any) {
      console.error('Error deleting building:', err)
      setBuildings(previous)
      setError(err?.message || 'Failed to delete building')
    } finally {
      setDeletingId(null)
    }
  }

  if (isLoading) {
    return (
      <main className="max-w-[1000px] mx-auto px-6 py-16">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="space-y-2">
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-[1000px] mx-auto px-6 py-16">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/adminos/dashboard"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold">Buildings</h1>
        </div>
        <Link
          href="/adminos/dashboard/buildings/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Building
        </Link>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 mb-6 text-sm text-destructive bg-destructive/10 rounded-md">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="space-y-4">
        {buildings.map((building) => (
          <div
            key={building.id}
            className="flex items-center justify-between p-4 bg-card rounded-lg border"
          >
            <div>
              <h3 className="font-medium mb-1">{building.title}</h3>
              <p className="text-sm text-muted-foreground">{building.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/adminos/dashboard/buildings/${building.id}`}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </Link>
              <button
                onClick={() => handleDelete(building.id)}
                disabled={deletingId === building.id}
                className="p-2 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
              >
                {deletingId === building.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ))}

        {buildings.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No buildings yet. Click &quot;Add Building&quot; to create one.
          </div>
        )}
      </div>
    </main>
  )
} 
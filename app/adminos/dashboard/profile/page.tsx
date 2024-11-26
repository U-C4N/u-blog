'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Plus, Trash2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { supabase, type Profile } from '@/lib/supabase/config'

const defaultProfile: Profile = {
  id: '123e4567-e89b-12d3-a456-426614174000', // Fixed UUID
  name: 'Railly Hugo',
  title: 'Hunter',
  subtitle: 'Software Engineer ~ AI Master\'s Student',
  present_text: [
    'I work as a full-stack engineer at Globant, contributing to Disney O&I Engineering Team.',
    'I like to build developer tools for myself and make them open source for the community.'
  ]
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile>(defaultProfile)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProfile() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .limit(1)
          .maybeSingle()

        if (error) {
          if (error.code === 'PGRST116') {
            // No profile found, create one
            const { error: insertError } = await supabase
              .from('profiles')
              .insert(defaultProfile)
            
            if (insertError) throw insertError
          } else {
            throw error
          }
        } else if (data) {
          setProfile(data)
        }
      } catch (err) {
        console.error('Error fetching profile:', err)
        setError('Failed to load profile data')
      }
    }

    fetchProfile()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          ...profile,
          updated_at: new Date().toISOString()
        })

      if (upsertError) throw upsertError
      router.push('/adminos/dashboard')
      router.refresh()
    } catch (err: any) {
      console.error('Error updating profile:', err)
      setError(err.message || 'Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  const addPresentText = () => {
    setProfile(prev => ({
      ...prev,
      present_text: [...prev.present_text, '']
    }))
  }

  const removePresentText = (index: number) => {
    setProfile(prev => ({
      ...prev,
      present_text: prev.present_text.filter((_, i) => i !== index)
    }))
  }

  const updatePresentText = (index: number, value: string) => {
    setProfile(prev => ({
      ...prev,
      present_text: prev.present_text.map((text, i) => i === index ? value : text)
    }))
  }

  return (
    <main className="max-w-[1000px] mx-auto px-6 py-16">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/adminos/dashboard"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold">Edit Profile</h1>
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
            <label htmlFor="name" className="block text-sm font-medium text-muted-foreground mb-2">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={profile.name}
              onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-muted-foreground mb-2">
              Title
            </label>
            <input
              type="text"
              id="title"
              value={profile.title}
              onChange={(e) => setProfile(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          <div>
            <label htmlFor="subtitle" className="block text-sm font-medium text-muted-foreground mb-2">
              Subtitle
            </label>
            <input
              type="text"
              id="subtitle"
              value={profile.subtitle}
              onChange={(e) => setProfile(prev => ({ ...prev, subtitle: e.target.value }))}
              className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-muted-foreground">
                Present Text
              </label>
              <button
                type="button"
                onClick={addPresentText}
                className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80"
              >
                <Plus className="w-4 h-4" />
                Add Text
              </button>
            </div>
            <div className="space-y-3">
              {profile.present_text.map((text, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => updatePresentText(index, e.target.value)}
                    className="flex-1 px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Enter text..."
                    required
                  />
                  <button
                    type="button"
                    onClick={() => removePresentText(index)}
                    className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                    disabled={profile.present_text.length <= 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Link
              href="/adminos/dashboard"
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
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
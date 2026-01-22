import type { Metadata } from 'next'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/config'
import { env } from '@/env.mjs'

export const metadata: Metadata = {
  title: 'Tags',
  description: 'Browse all tags',
  alternates: { canonical: `${env.NEXT_PUBLIC_SITE_URL}/tags` },
}

export default async function TagsPage() {
  const { data: posts } = await supabase
    .from('posts')
    .select('tags')
    .eq('published', true)

  const tagCounts: Record<string, number> = {}
  ;(posts || []).forEach(p => {
    ;(p.tags || []).forEach((t: string) => {
      tagCounts[t] = (tagCounts[t] || 0) + 1
    })
  })

  // Use toSorted() for immutable sorting
  const tags = Object.entries(tagCounts).toSorted((a, b) => b[1] - a[1])

  return (
    <main className="max-w-[1000px] mx-auto px-6 py-16">
      <h1 className="text-2xl font-bold mb-6">Tags</h1>
      {tags.length === 0 ? (
        <p className="text-muted-foreground">No tags yet.</p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {tags.map(([tag, count]) => (
            <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`} className="px-3 py-1 rounded bg-muted hover:bg-muted/80">
              #{tag} <span className="text-muted-foreground">({count})</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}



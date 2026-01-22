import Link from 'next/link'
import { cache } from 'react'
import { supabase, type Post } from '@/lib/supabase/config'

interface RelatedPostsProps {
  currentPostId: string
  currentPostTags: string[]
  limit?: number
  className?: string
}

// React.cache for per-request deduplication of related posts fetch
const getRelatedPostsData = cache(async (currentPostId: string, postLimit: number) => {
  const { data } = await supabase
    .from('posts')
    .select('*')
    .neq('id', currentPostId)
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(postLimit + 3)
  return data
})

export async function RelatedPosts({
  currentPostId,
  currentPostTags,
  limit = 3,
  className = '',
}: RelatedPostsProps) {
  // Use cached fetch for per-request deduplication
  const relatedPosts = await getRelatedPostsData(currentPostId, limit)

  if (!relatedPosts || relatedPosts.length === 0) {
    return null
  }

  // Use Set for O(1) tag lookups instead of O(n) includes
  const currentTagsSet = new Set(currentPostTags)

  // Score posts by matching tags and recency
  const scoredPosts = relatedPosts.map(post => {
    const postTags = post.tags || []
    // O(n) instead of O(n²) - check each post tag against Set
    const matchingTagsCount = postTags.filter((tag: string) => currentTagsSet.has(tag)).length
    const tagScore = matchingTagsCount * 2  // Each matching tag is worth 2 points

    // Calculate recency score (newer posts get higher scores)
    const ageInDays = (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60 * 24)
    const recencyScore = Math.max(0, 5 - Math.floor(ageInDays / 30)) // Newer posts get up to 5 points

    return {
      ...post,
      score: tagScore + recencyScore
    }
  })

  // Use toSorted() for immutable sorting (doesn't mutate original array)
  const topRelatedPosts = scoredPosts
    .toSorted((a, b) => b.score - a.score)
    .slice(0, limit)

  if (topRelatedPosts.length === 0) {
    return null
  }

  return (
    <div className={className}>
      <h3 className="text-xl font-medium mb-4">Related Posts</h3>
      <div className="space-y-4">
        {topRelatedPosts.map(post => (
          <div key={post.id} className="border-b border-border pb-4 last:border-0">
            <Link 
              href={`/blog/${post.slug}`}
              className="block hover:underline font-medium"
            >
              {post.title}
            </Link>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <time dateTime={post.created_at}>
                {new Date(post.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </time>
              {post.tags && post.tags.length > 0 && (
                <>
                  <span>•</span>
                  <div className="flex flex-wrap gap-1">
                    {post.tags.slice(0, 2).map((tag: string) => (
                      <span key={tag} className="text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 
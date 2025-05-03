import Link from 'next/link'
import { supabase, type Post } from '@/lib/supabase/config'

interface RelatedPostsProps {
  currentPostId: string
  currentPostTags: string[]
  limit?: number
  className?: string
}

export async function RelatedPosts({
  currentPostId,
  currentPostTags,
  limit = 3,
  className = '',
}: RelatedPostsProps) {
  // Get related posts based on matching tags
  const { data: relatedPosts } = await supabase
    .from('posts')
    .select('*')
    .neq('id', currentPostId) // Exclude current post
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(limit + 3) // Get a few extras to filter by tags

  if (!relatedPosts || relatedPosts.length === 0) {
    return null
  }

  // Score posts by matching tags and recency
  const scoredPosts = relatedPosts.map(post => {
    const postTags = post.tags || []
    const matchingTags = currentPostTags.filter(tag => postTags.includes(tag))
    const tagScore = matchingTags.length * 2  // Each matching tag is worth 2 points
    
    // Calculate recency score (newer posts get higher scores)
    const ageInDays = (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60 * 24)
    const recencyScore = Math.max(0, 5 - Math.floor(ageInDays / 30)) // Newer posts get up to 5 points
    
    return {
      ...post,
      score: tagScore + recencyScore
    }
  })

  // Sort by score and take the top posts
  const topRelatedPosts = scoredPosts
    .sort((a, b) => b.score - a.score)
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
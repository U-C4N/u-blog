import Link from 'next/link'
import { cache } from 'react'
import { supabase } from '@/lib/supabase/config'

interface RelatedPostsProps {
  currentPostId: string
  currentPostTags: string[]
  limit?: number
  className?: string
}

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

function formatRomanMonth(date: Date): string {
  const monthIdx = date.getMonth()
  return ROMAN_NUMERALS[monthIdx] ?? `${monthIdx + 1}`
}

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
  const relatedPosts = await getRelatedPostsData(currentPostId, limit)

  if (!relatedPosts || relatedPosts.length === 0) {
    return null
  }

  const currentTagsSet = new Set(currentPostTags)

  const scoredPosts = relatedPosts.map((post) => {
    const postTags = post.tags || []
    const matchingTagsCount = postTags.filter((tag: string) => currentTagsSet.has(tag)).length
    const tagScore = matchingTagsCount * 2

    const ageInDays = (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60 * 24)
    const recencyScore = Math.max(0, 5 - Math.floor(ageInDays / 30))

    return {
      ...post,
      score: tagScore + recencyScore,
    }
  })

  const topRelatedPosts = scoredPosts
    .toSorted((a, b) => b.score - a.score)
    .slice(0, limit)

  if (topRelatedPosts.length === 0) {
    return null
  }

  return (
    <div className={className}>
      <h3 className="serif-display text-[12px] tracking-[0.4em] uppercase classical-ink">
        Further Reading
      </h3>
      <span className="block gold-divider w-16 mt-3 mb-5" />
      <ul className="flex flex-col">
        {topRelatedPosts.map((post) => {
          const d = new Date(post.created_at)
          const day = d.getDate().toString().padStart(2, '0')
          const month = formatRomanMonth(d)
          return (
            <li
              key={post.id}
              className="group border-t border-[hsl(var(--ink)/0.08)] last:border-b blog-post-item"
            >
              <Link
                href={`/blog/${post.slug}`}
                className="block py-5 sm:py-6 transition-colors hover:bg-[hsl(var(--cream)/0.5)] -mx-3 px-3 rounded-sm"
              >
                <div className="grid grid-cols-[auto_1fr_auto] items-baseline gap-4 sm:gap-6">
                  <div className="flex items-baseline gap-1.5 shrink-0 min-w-[78px]">
                    <span className="serif-display text-[18px] sm:text-[20px] classical-ink tabular-nums leading-none">
                      {day}
                    </span>
                    <span className="serif-display text-[11px] tracking-[0.2em] gold-text leading-none">
                      {month}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <h4 className="classical-sans text-[15px] sm:text-[16px] font-medium classical-ink leading-snug group-hover:gold-text transition-colors">
                      {post.title}
                    </h4>
                    {post.tags && post.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                        {post.tags.slice(0, 3).map((tag: string) => (
                          <span
                            key={tag}
                            className="serif-body italic text-[12px] classical-ink-muted"
                          >
                            <span className="gold-text mr-0.5">·</span>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <span
                    aria-hidden
                    className="classical-sans text-[12px] tracking-[0.2em] uppercase gold-text shrink-0 hidden sm:inline-flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Read
                    <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
                  </span>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

import type { Metadata } from 'next'
import { cache } from 'react'
import { supabase } from '@/lib/supabase/config'
import { EditPostForm } from './edit-post-form'

export const dynamic = 'force-dynamic'

type PageParams = Promise<{
  id: string
}>

type Props = {
  params: PageParams
}

// React.cache for per-request deduplication (shared between generateMetadata and page)
const getPost = cache(async (id: string) => {
  const { data } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .single()
  return data
})

export async function generateStaticParams() {
  const { data: posts } = await supabase
    .from('posts')
    .select('id')

  return (posts || []).map((post) => ({
    id: post.id,
  }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params
  // Use cached getPost to deduplicate with page component
  const post = await getPost(resolvedParams.id)

  return {
    title: `Edit ${post?.title || 'Post'}`,
    description: `Edit post ${post?.title || ''}`,
  }
}

export default async function Page({ params }: Props) {
  const resolvedParams = await params
  // Use cached getPost - same request as generateMetadata won't re-fetch
  const post = await getPost(resolvedParams.id)

  return <EditPostForm initialPost={post} />
}
import type { Metadata } from 'next'
import { cache } from 'react'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Post } from '@/lib/supabase/config'
import { EditPostForm } from './edit-post-form'

export const dynamic = 'force-dynamic'

type PageParams = Promise<{
  id: string
}>

type Props = {
  params: PageParams
}

// React.cache for per-request deduplication (shared between generateMetadata and page)
const getPost = cache(async (id: string): Promise<Post | null> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .single()

  if (!data) return null

  // Map nullable DB columns to undefined to match Post type
  const transformedPost: Post = {
    ...data,
    content: data.content ?? '',
    published: data.published ?? false,
    tags: data.tags ?? undefined,
    meta_title: data.meta_title ?? undefined,
    meta_description: data.meta_description ?? undefined,
    canonical_url: data.canonical_url ?? undefined,
    og_image_url: data.og_image_url ?? undefined,
    noindex: data.noindex ?? undefined,
    translations: data.translations
      ? (data.translations as { [key: string]: { title: string; content: string; slug: string } })
      : undefined,
  }

  return transformedPost
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params
  const post = await getPost(resolvedParams.id)

  return {
    title: `Edit ${post?.title || 'Post'}`,
    description: `Edit post ${post?.title || ''}`,
    robots: { index: false, follow: false },
  }
}

export default async function Page({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/adminos/login')

  const resolvedParams = await params
  const post = await getPost(resolvedParams.id)

  if (!post) {
    notFound()
  }

  return <EditPostForm initialPost={post} />
}

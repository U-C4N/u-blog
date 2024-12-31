import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase/config'
import { EditPostForm } from './edit-post-form'

export const dynamic = 'force-dynamic'

interface PageParams {
  id: string
}

interface PageProps {
  params: PageParams
  searchParams: { [key: string]: string | string[] | undefined }
}

export async function generateStaticParams(): Promise<PageParams[]> {
  const { data: posts } = await supabase
    .from('posts')
    .select('id')

  return (posts || []).map((post) => ({
    id: post.id,
  }))
}

export async function generateMetadata(
  { params }: PageProps
): Promise<Metadata> {
  const { data: post } = await supabase
    .from('posts')
    .select('title')
    .eq('id', params.id)
    .single()

  return {
    title: `Edit ${post?.title || 'Post'}`,
    description: `Edit post ${post?.title || ''}`,
  }
}

export default async function Page({ params }: PageProps) {
  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('id', params.id)
    .single()

  return <EditPostForm initialPost={post} />
}
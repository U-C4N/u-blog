import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase/config'
import { EditPostForm } from './edit-post-form'

export const dynamic = 'force-dynamic'

type PageParams = Promise<{
  id: string
}>

type Props = {
  params: PageParams
}

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
  const { data: post } = await supabase
    .from('posts')
    .select('title')
    .eq('id', resolvedParams.id)
    .single()

  return {
    title: `Edit ${post?.title || 'Post'}`,
    description: `Edit post ${post?.title || ''}`,
  }
}

export default async function Page({ params }: Props) {
  const resolvedParams = await params
  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('id', resolvedParams.id)
    .single()

  return <EditPostForm initialPost={post} />
}
import { Metadata } from 'next'
import { supabase } from '@/lib/supabase/config'
import { EditPostForm } from './edit-post-form'

type Props = {
  params: {
    id: string
  }
  searchParams: { [key: string]: string | string[] | undefined }
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
  const { data: post } = await supabase
    .from('posts')
    .select('title')
    .eq('id', params.id)
    .single()

  return {
    title: `Edit ${post?.title || 'Post'}`
  }
}

export default async function EditPostPage({ params }: Props) {
  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('id', params.id)
    .single()

  return <EditPostForm initialPost={post} />
}
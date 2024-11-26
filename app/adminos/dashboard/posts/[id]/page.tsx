import { Metadata } from 'next'
import { supabase } from '@/lib/supabase/config'
import { EditPostForm } from './edit-post-form'

export async function generateStaticParams() {
  const { data: posts } = await supabase
    .from('posts')
    .select('id')

  return (posts || []).map((post) => ({
    id: post.id,
  }))
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const { data: post } = await supabase
    .from('posts')
    .select('title')
    .eq('id', params.id)
    .single()

  return {
    title: post?.title ? `Edit: ${post.title}` : 'Edit Post',
  }
}

export default async function EditPostPage({ params }: { params: { id: string } }) {
  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('id', params.id)
    .single()

  return <EditPostForm initialPost={post} />
}
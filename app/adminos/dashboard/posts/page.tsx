'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Trash2, ArrowLeft, AlertCircle, FileText, Calendar, Eye, MoreHorizontal } from 'lucide-react'
import Link from 'next/link'
import { supabase, type Post } from '@/lib/supabase/config'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'

export default function PostsPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPosts()
  }, [])

  async function fetchPosts() {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Veritabanından gelen nullable değerleri Post tipine uygun hale getir
      const transformedPosts: Post[] = (data || []).map((post) => ({
        ...post,
        content: post.content ?? '',
        published: post.published ?? false,
        tags: post.tags ?? undefined,
        meta_title: post.meta_title ?? undefined,
        meta_description: post.meta_description ?? undefined,
        canonical_url: post.canonical_url ?? undefined,
        og_image_url: post.og_image_url ?? undefined,
        noindex: post.noindex ?? undefined,
        translations: post.translations ? (post.translations as { [key: string]: { title: string; content: string; slug: string } }) : undefined
      }))
      
      setPosts(transformedPosts)
    } catch (err: any) {
      console.error('Error fetching posts:', err)
      setError(err.message || 'Failed to load posts')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id)

      if (error) throw error
      setPosts(posts.filter(post => post.id !== id))
    } catch (err: any) {
      console.error('Error deleting post:', err)
      setError('Failed to delete post')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const publishedPosts = posts.filter(post => post.published).length
  const draftPosts = posts.filter(post => !post.published).length

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="max-w-6xl mx-auto p-6">
          <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-white/40 dark:border-gray-700/40 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Skeleton className="h-9 w-20 rounded-xl" />
                <div>
                  <Skeleton className="h-8 w-32 mb-2 rounded-xl" />
                  <Skeleton className="h-4 w-48 rounded-xl" />
                </div>
              </div>
              <Skeleton className="h-10 w-28 rounded-xl" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>

          <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-white/40 dark:border-gray-700/40 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] p-6">
            <Skeleton className="h-6 w-24 rounded-xl mb-6" />
            <div className="space-y-4">
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-white/40 dark:border-gray-700/40 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] px-6 py-5 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild className="rounded-xl hover:bg-white/50 dark:hover:bg-gray-800/50">
                <Link href="/adminos/dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Dashboard
                </Link>
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Blog Posts</h1>
                <p className="text-muted-foreground text-sm">Manage your blog content</p>
              </div>
            </div>

            <Button asChild className="rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
              <Link href="/adminos/dashboard/posts/new">
                <Plus className="w-4 h-4 mr-2" />
                New Post
              </Link>
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm border border-red-200/50 dark:border-red-800/50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border border-white/40 dark:border-gray-700/30 rounded-2xl p-6 hover:bg-white/60 dark:hover:bg-gray-900/60 transition-all duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center bg-primary/10 rounded-xl">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{posts.length}</p>
                <p className="text-sm text-muted-foreground">Total Posts</p>
              </div>
            </div>
          </div>
          <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border border-white/40 dark:border-gray-700/30 rounded-2xl p-6 hover:bg-white/60 dark:hover:bg-gray-900/60 transition-all duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center bg-green-500/10 rounded-xl">
                <Eye className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{publishedPosts}</p>
                <p className="text-sm text-muted-foreground">Published</p>
              </div>
            </div>
          </div>
          <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border border-white/40 dark:border-gray-700/30 rounded-2xl p-6 hover:bg-white/60 dark:hover:bg-gray-900/60 transition-all duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center bg-orange-500/10 rounded-xl">
                <Calendar className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{draftPosts}</p>
                <p className="text-sm text-muted-foreground">Drafts</p>
              </div>
            </div>
          </div>
        </div>

        {/* Posts Table */}
        {posts.length === 0 ? (
          <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-white/40 dark:border-gray-700/40 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] p-12">
            <div className="text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-xl font-semibold mb-2">No posts yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Get started by creating your first blog post. Share your thoughts and ideas with the world.
              </p>
              <Button asChild className="rounded-xl">
                <Link href="/adminos/dashboard/posts/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Post
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-white/40 dark:border-gray-700/40 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="px-6 py-5 border-b border-white/30 dark:border-gray-700/30">
              <h2 className="text-lg font-semibold">All Posts</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Manage and organize your blog content</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-white/30 dark:border-gray-700/30 hover:bg-transparent">
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => (
                  <TableRow key={post.id} className="group border-white/20 dark:border-gray-700/20 hover:bg-white/30 dark:hover:bg-gray-800/30">
                    <TableCell className="font-medium max-w-[300px]">
                      <Link
                        href={`/blog/${post.slug}`}
                        className="hover:text-primary transition-colors truncate block"
                        target="_blank"
                      >
                        {post.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={post.published ? "default" : "secondary"}
                        className={post.published
                          ? "bg-green-100/80 text-green-700 hover:bg-green-100 border border-green-200/50 rounded-lg"
                          : "bg-gray-100/80 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-600/50 rounded-lg"}
                      >
                        {post.published ? 'Published' : 'Draft'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {post.tags && post.tags.length > 0 ? post.tags.join(', ') : '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(post.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                            <MoreHorizontal className="w-4 h-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-white/40 dark:border-gray-700/40 rounded-xl">
                          <DropdownMenuItem asChild>
                            <Link href={`/blog/${post.slug}`} target="_blank">
                              <Eye className="w-4 h-4 mr-2" />
                              View Post
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => router.push(`/adminos/dashboard/posts/${post.id}`)}
                          >
                            <Edit2 className="w-4 h-4 mr-2" />
                            Edit Post
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/30 dark:bg-gray-700/30" />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Post
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-white/40 dark:border-gray-700/40 rounded-2xl">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Post</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete &quot;{post.title}&quot;? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(post.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
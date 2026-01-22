'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Save, Plus, Trash2, AlertCircle, Building, Github, Check, User, Globe, Link as LinkIcon, Settings } from 'lucide-react'
import Link from 'next/link'
import { supabase, type Profile, type Building as BuildingType, type GithubRepo } from '@/lib/supabase/config'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'

const defaultProfile: Profile = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Umutcan Edizaslan',
  title: 'MR.Creator',
  subtitle: 'Software Engineer ~ AI Master\'s Student',
  present_text: [
    'I work as a full-stack engineer at Globant, contributing to Disney O&I Engineering Team.',
    'I like to build developer tools for myself and make them open source for the community.'
  ],
  social_links: { twitter: '', linkedin: '', github: '' },
  github_token: '',
  github_username: '',
  meta_description: '',
  meta_keywords: [],
  og_image_url: '',
  twitter_card_type: 'summary_large_image',
  website_url: '',
  location: '',
  company: '',
  job_title: ''
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>(defaultProfile)
  const [buildings, setBuildings] = useState<BuildingType[]>([])
  const [githubRepos, setGithubRepos] = useState<GithubRepo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isValidatingToken, setIsValidatingToken] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [profileRes, buildingsRes, reposRes] = await Promise.all([
        supabase.from('profiles').select('*').limit(1).maybeSingle(),
        supabase.from('buildings').select('*').order('order_index'),
        supabase.from('github_repos').select('*')
      ]);

      if (profileRes.data) {
        setProfile({
          ...defaultProfile,
          ...profileRes.data,
          social_links: profileRes.data.social_links || { twitter: '', linkedin: '', github: '' },
          meta_keywords: profileRes.data.meta_keywords || []
        });
      }

      // Veritabanından gelen nullable değerleri Building tipine uygun hale getir
      const buildingsRaw = buildingsRes.data || []
      const transformedBuildings: BuildingType[] = buildingsRaw.map((building) => ({
        ...building,
        external: building.external ?? false,
        order_index: building.order_index ?? 0
      }))
      setBuildings(transformedBuildings);
      setGithubRepos(reposRes.data || []);
    } catch (err) {
      setError('Failed to load data');
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const updatedProfile = {
        ...profile,
        present_text: profile.present_text.filter(text => text.trim() !== ''),
        updated_at: new Date().toISOString()
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updatedProfile)
        .eq('id', profile.id)

      if (updateError) throw updateError;
      
      window.location.href = `/?t=${Date.now()}`;
    } catch (err: any) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  const updateProfile = (updates: Partial<Profile>) => {
    setProfile(prev => ({ ...prev, ...updates }))
  }

  const updatePresentText = (index: number, value: string) => {
    const newTexts = [...profile.present_text]
    newTexts[index] = value
    updateProfile({ present_text: newTexts })
  }

  const addPresentText = () => {
    if (profile.present_text.length < 3) {
      updateProfile({ present_text: [...profile.present_text, ''] })
    }
  }

  const removePresentText = (index: number) => {
    updateProfile({ present_text: profile.present_text.filter((_, i) => i !== index) })
  }

  const validateGithubToken = async () => {
    if (!profile.github_token) return;

    setIsValidatingToken(true);
    try {
      const headers = { 'Authorization': `token ${profile.github_token}` };

      // Parallelize GitHub API calls (user + repos fetch simultaneously)
      const [userResponse, reposResponse] = await Promise.all([
        fetch('https://api.github.com/user', { headers }),
        fetch('https://api.github.com/user/repos?per_page=100&sort=updated', { headers })
      ]);

      if (!userResponse.ok) throw new Error('Invalid GitHub token');

      const userData = await userResponse.json();
      updateProfile({ github_username: userData.login });

      if (reposResponse.ok) {
        const repos = await reposResponse.json();

        // Batch upsert instead of individual upserts in loop
        const repoData = repos.map((repo: { name: string; html_url: string; description: string | null }) => ({
          repo_name: repo.name,
          repo_url: repo.html_url,
          description: repo.description || '',
          selected: false
        }));

        // Single batch upsert operation
        await supabase.from('github_repos').upsert(repoData, { onConflict: 'repo_url' });
        fetchData();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to validate GitHub token');
    } finally {
      setIsValidatingToken(false);
    }
  }

  const toggleRepoSelection = async (repo: GithubRepo) => {
    const selectedCount = githubRepos.filter(r => r.selected).length;
    
    if (!repo.selected && selectedCount >= 4) {
      setError('You can only select up to 4 repositories');
      return;
    }

    try {
      await supabase.from('github_repos').update({ selected: !repo.selected }).eq('id', repo.id);
      fetchData();
    } catch (err: any) {
      setError(err.message)
    }
  }

  const addKeyword = () => {
    const keyword = prompt('Enter a keyword:');
    if (keyword?.trim()) {
      updateProfile({ meta_keywords: [...(profile.meta_keywords || []), keyword.trim()] });
    }
  };

  const removeKeyword = (index: number) => {
    updateProfile({ meta_keywords: profile.meta_keywords?.filter((_, i) => i !== index) || [] });
  };

  const buildingOperations = {
    add: async () => {
      try {
        await supabase.from('buildings').insert({
          title: 'New Project',
          description: 'Project description',
          external: false,
          order_index: buildings.length
        });
        fetchData();
      } catch (err: any) {
        setError(err.message)
      }
    },
    update: async (id: string, data: Partial<BuildingType>) => {
      try {
        await supabase.from('buildings').update(data).eq('id', id);
        fetchData();
      } catch (err: any) {
        setError(err.message)
      }
    },
    delete: async (id: string) => {
      try {
        await supabase.from('buildings').delete().eq('id', id);
        fetchData();
      } catch (err: any) {
        setError(err.message)
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/adminos/dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Profile Settings</h1>
            <p className="text-sm text-muted-foreground">Manage your personal information</p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="personal" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="personal">
                <User className="w-4 h-4 mr-2" />
                Personal
              </TabsTrigger>
              <TabsTrigger value="projects">
                <Building className="w-4 h-4 mr-2" />
                Projects
              </TabsTrigger>
              <TabsTrigger value="github">
                <Github className="w-4 h-4 mr-2" />
                GitHub
              </TabsTrigger>
              <TabsTrigger value="seo">
                <Settings className="w-4 h-4 mr-2" />
                SEO
              </TabsTrigger>
            </TabsList>

            {/* Personal Tab */}
            <TabsContent value="personal" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Info Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={profile.name}
                        onChange={(e) => updateProfile({ name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={profile.title}
                        onChange={(e) => updateProfile({ title: e.target.value })}
                        placeholder="e.g., MR.Creator"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="subtitle">Subtitle</Label>
                      <Input
                        id="subtitle"
                        value={profile.subtitle}
                        onChange={(e) => updateProfile({ subtitle: e.target.value })}
                        placeholder="e.g., Software Engineer ~ AI Student"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={profile.location || ''}
                          onChange={(e) => updateProfile({ location: e.target.value })}
                          placeholder="Istanbul, Turkey"
                        />
                      </div>
                      <div>
                        <Label htmlFor="company">Company</Label>
                        <Input
                          id="company"
                          value={profile.company || ''}
                          onChange={(e) => updateProfile({ company: e.target.value })}
                          placeholder="Globant"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Social Links Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Social Links</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="twitter">Twitter / X</Label>
                      <Input
                        id="twitter"
                        type="url"
                        value={profile.social_links?.twitter || ''}
                        onChange={(e) => updateProfile({
                          social_links: { ...profile.social_links, twitter: e.target.value }
                        })}
                        placeholder="https://twitter.com/username"
                      />
                    </div>
                    <div>
                      <Label htmlFor="linkedin">LinkedIn</Label>
                      <Input
                        id="linkedin"
                        type="url"
                        value={profile.social_links?.linkedin || ''}
                        onChange={(e) => updateProfile({
                          social_links: { ...profile.social_links, linkedin: e.target.value }
                        })}
                        placeholder="https://linkedin.com/in/username"
                      />
                    </div>
                    <div>
                      <Label htmlFor="github_profile">GitHub Profile</Label>
                      <Input
                        id="github_profile"
                        type="url"
                        value={profile.social_links?.github || ''}
                        onChange={(e) => updateProfile({
                          social_links: { ...profile.social_links, github: e.target.value }
                        })}
                        placeholder="https://github.com/username"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Present Text Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Present Text
                    <Button type="button" variant="outline" size="sm" onClick={addPresentText} disabled={profile.present_text.length >= 3}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </CardTitle>
                  <CardDescription>Describe what you&apos;re currently working on (max 3 lines)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {profile.present_text.map((text, index) => (
                      <div key={index} className="flex gap-2">
                        <Textarea
                          value={text}
                          onChange={(e) => updatePresentText(index, e.target.value)}
                          placeholder="What are you working on?"
                          className="min-h-[60px]"
                          required
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removePresentText(index)}
                          disabled={profile.present_text.length <= 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Projects Tab */}
            <TabsContent value="projects" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Portfolio Projects
                    <Button type="button" onClick={buildingOperations.add} disabled={buildings.length >= 5} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Project
                    </Button>
                  </CardTitle>
                  <CardDescription>Manage your portfolio projects (max 5)</CardDescription>
                </CardHeader>
                <CardContent>
                  {buildings.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Building className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No projects yet. Click &quot;Add Project&quot; to get started.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {buildings.map((building) => (
                        <Card key={building.id} className="p-4">
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <Label>Title</Label>
                                <Input
                                  value={building.title}
                                  onChange={(e) => buildingOperations.update(building.id, { title: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label>Order</Label>
                                <Input
                                  type="number"
                                  value={building.order_index}
                                  onChange={(e) => buildingOperations.update(building.id, { order_index: parseInt(e.target.value) })}
                                  min="0"
                                />
                              </div>
                              <div className="flex items-end">
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => buildingOperations.delete(building.id)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                            <div>
                              <Label>Description</Label>
                              <Textarea
                                value={building.description}
                                onChange={(e) => buildingOperations.update(building.id, { description: e.target.value })}
                                className="min-h-[60px]"
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={building.external}
                                onCheckedChange={(checked) => buildingOperations.update(building.id, { external: checked })}
                              />
                              <Label className="text-sm">External Link</Label>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* GitHub Tab */}
            <TabsContent value="github" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>GitHub Integration</CardTitle>
                  <CardDescription>Connect your GitHub to sync repositories</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="github_token">Personal Access Token</Label>
                    <div className="flex gap-2">
                      <Input
                        id="github_token"
                        type="password"
                        value={profile.github_token || ''}
                        onChange={(e) => updateProfile({ github_token: e.target.value })}
                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      />
                      <Button
                        type="button"
                        onClick={validateGithubToken}
                        disabled={!profile.github_token || isValidatingToken}
                        variant="outline"
                      >
                        {isValidatingToken ? 'Validating...' : 'Validate'}
                      </Button>
                    </div>
                    {profile.github_username && (
                      <div className="flex items-center gap-2 mt-2 text-sm text-green-600">
                        <Check className="w-4 h-4" />
                        Connected as @{profile.github_username}
                      </div>
                    )}
                  </div>

                  {profile.github_username && githubRepos.length > 0 && (
                    <div className="space-y-4">
                      <Separator />
                      <div>
                        <Label className="text-base">Repository Selection (max 4)</Label>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {githubRepos.map((repo) => (
                          <Card key={repo.id} className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Github className="w-4 h-4 text-muted-foreground" />
                                  <h4 className="font-medium truncate">{repo.repo_name}</h4>
                                </div>
                                {repo.description && (
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{repo.description}</p>
                                )}
                              </div>
                              <Button
                                type="button"
                                variant={repo.selected ? "default" : "outline"}
                                size="sm"
                                onClick={() => toggleRepoSelection(repo)}
                                disabled={!repo.selected && githubRepos.filter(r => r.selected).length >= 4}
                                className="ml-2"
                              >
                                {repo.selected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* SEO Tab */}
            <TabsContent value="seo" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>SEO Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="meta_description">Meta Description</Label>
                      <Textarea
                        id="meta_description"
                        value={profile.meta_description || ''}
                        onChange={(e) => updateProfile({ meta_description: e.target.value })}
                        placeholder="Brief description for search engines (150-160 chars)"
                        className="min-h-[80px]"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {(profile.meta_description || '').length}/160 characters
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="website_url">Website URL</Label>
                      <Input
                        id="website_url"
                        type="url"
                        value={profile.website_url || ''}
                        onChange={(e) => updateProfile({ website_url: e.target.value })}
                        placeholder="https://your-website.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="og_image_url">Open Graph Image</Label>
                      <Input
                        id="og_image_url"
                        type="url"
                        value={profile.og_image_url || ''}
                        onChange={(e) => updateProfile({ og_image_url: e.target.value })}
                        placeholder="https://your-image.jpg"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      SEO Keywords
                      <Button type="button" variant="outline" size="sm" onClick={addKeyword}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {(profile.meta_keywords || []).map((keyword, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {keyword}
                          <button
                            type="button"
                            onClick={() => removeKeyword(index)}
                            className="ml-1 hover:text-destructive"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                      {(!profile.meta_keywords || profile.meta_keywords.length === 0) && (
                        <p className="text-sm text-muted-foreground">No keywords yet. Click &quot;Add&quot; to get started.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Save Button */}
          <div className="flex justify-end gap-4 pt-6 border-t">
            <Button variant="outline" asChild>
              <Link href="/adminos/dashboard">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isLoading}>
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
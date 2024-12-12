'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Plus, Trash2, AlertCircle, Building, Github, Check } from 'lucide-react'
import Link from 'next/link'
import { supabase, type Profile, type Building as BuildingType, type GithubRepo } from '@/lib/supabase/config'

const defaultProfile: Profile = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Umutcan Edizaslan',
  title: 'MR.Creator',
  subtitle: 'Software Engineer ~ AI Master\'s Student',
  present_text: [
    'I work as a full-stack engineer at Globant, contributing to Disney O&I Engineering Team.',
    'I like to build developer tools for myself and make them open source for the community.'
  ],
  social_links: {
    twitter: '',
    linkedin: '',
    github: ''
  },
  github_token: '',
  github_username: ''
}

export default function ProfilePage() {
  const router = useRouter()
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
      console.log('Fetching data...');
      const [profileRes, buildingsRes, reposRes] = await Promise.all([
        supabase.from('profiles').select('*').limit(1).maybeSingle(),
        supabase.from('buildings').select('*').order('order_index'),
        supabase.from('github_repos').select('*')
      ]);

      console.log('Profile response:', profileRes);
      console.log('Buildings response:', buildingsRes);
      console.log('Repos response:', reposRes);

      if (profileRes.error) {
        if (profileRes.error.code === 'PGRST116') {
          console.log('No profile found, creating default...');
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              ...defaultProfile,
              social_links: {
                twitter: '',
                linkedin: '',
                github: ''
              }
            });
          
          if (insertError) {
            console.error('Error creating profile:', insertError);
            throw insertError;
          }
        } else {
          console.error('Error fetching profile:', profileRes.error);
          throw profileRes.error;
        }
      } else if (profileRes.data) {
        console.log('Setting profile data:', profileRes.data);
        // Ensure social_links exists
        const profile = {
          ...profileRes.data,
          social_links: profileRes.data.social_links || {
            twitter: '',
            linkedin: '',
            github: ''
          }
        };
        setProfile(profile);
      }

      if (buildingsRes.error) {
        console.error('Error fetching buildings:', buildingsRes.error);
      } else {
        console.log('Setting buildings:', buildingsRes.data);
        setBuildings(buildingsRes.data || []);
      }

      if (reposRes.error) {
        console.error('Error fetching repos:', reposRes.error);
      } else {
        console.log('Setting repos:', reposRes.data);
        setGithubRepos(reposRes.data || []);
      }
    } catch (err) {
      console.error('Error in fetchData:', err);
      setError('Failed to load data');
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      console.log('Current profile state:', profile);

      // Ensure social_links is properly structured
      const updatedProfile = {
        id: profile.id,
        name: profile.name,
        title: profile.title,
        subtitle: profile.subtitle,
        present_text: profile.present_text.filter(text => text.trim() !== ''),
        social_links: {
          twitter: profile.social_links?.twitter || '',
          linkedin: profile.social_links?.linkedin || '',
          github: profile.social_links?.github || ''
        },
        github_token: profile.github_token || '',
        github_username: profile.github_username || '',
        updated_at: new Date().toISOString()
      }

      console.log('Updating profile with:', updatedProfile);

      // First try to update
      const { data: updateData, error: updateError } = await supabase
        .from('profiles')
        .update(updatedProfile)
        .eq('id', profile.id)
        .select()
        .single()

      if (updateError) {
        // If update fails, try to insert
        console.log('Update failed, trying insert...');
        const { data: insertData, error: insertError } = await supabase
          .from('profiles')
          .insert(updatedProfile)
          .select()
          .single()

        if (insertError) {
          console.error('Insert error:', insertError);
          throw insertError;
        }

        console.log('Insert successful, response:', insertData);
        setProfile(insertData);
      } else {
        console.log('Update successful, response:', updateData);
        setProfile(updateData);
      }

      // Force a cache revalidation by adding a timestamp to the URL
      window.location.href = `/?t=${Date.now()}`;
      
    } catch (err: any) {
      console.error('Error updating profile:', err)
      setError(err.message || 'Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  const addPresentText = () => {
    if (profile.present_text.length >= 3) return;
    setProfile(prev => ({
      ...prev,
      present_text: [...prev.present_text, '']
    }))
  }

  const removePresentText = (index: number) => {
    setProfile(prev => ({
      ...prev,
      present_text: prev.present_text.filter((_, i) => i !== index)
    }))
  }

  const updatePresentText = (index: number, value: string) => {
    setProfile(prev => ({
      ...prev,
      present_text: prev.present_text.map((text, i) => i === index ? value : text)
    }))
  }

  const addBuilding = async () => {
    try {
      const { error } = await supabase
        .from('buildings')
        .insert({
          title: 'New Building',
          description: 'Description here',
          external: false,
          order_index: buildings.length
        })

      if (error) throw error
      fetchData()
    } catch (err: any) {
      console.error('Error adding building:', err)
      setError(err.message)
    }
  }

  const updateBuilding = async (id: string, data: Partial<BuildingType>) => {
    try {
      const { error } = await supabase
        .from('buildings')
        .update(data)
        .eq('id', id)

      if (error) throw error
      fetchData()
    } catch (err: any) {
      console.error('Error updating building:', err)
      setError(err.message)
    }
  }

  const deleteBuilding = async (id: string) => {
    try {
      const { error } = await supabase
        .from('buildings')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchData()
    } catch (err: any) {
      console.error('Error deleting building:', err)
      setError(err.message)
    }
  }

  const validateGithubToken = async () => {
    if (!profile.github_token) return;

    setIsValidatingToken(true);
    try {
      // Test user endpoint
      console.log('Testing /user endpoint...');
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${profile.github_token}`,
          Accept: 'application/vnd.github.v3+json'
        }
      });

      const userText = await userResponse.text();
      console.log('User Response:', userResponse.status, userText);

      if (!userResponse.ok) {
        throw new Error(`GitHub API Error: ${userResponse.status} ${userText}`);
      }

      const userData = JSON.parse(userText);
      console.log('User Data:', userData);

      // Test repos endpoint
      console.log('Testing /user/repos endpoint...');
      const reposResponse = await fetch(
        `https://api.github.com/users/${userData.login}/repos?sort=updated&per_page=100`,
        {
          headers: {
            Authorization: `Bearer ${profile.github_token}`,
            Accept: 'application/vnd.github.v3+json'
          }
        }
      );

      const reposText = await reposResponse.text();
      console.log('Repos Response:', reposResponse.status, reposText);

      if (!reposResponse.ok) {
        throw new Error(`GitHub API Error: ${reposResponse.status} ${reposText}`);
      }

      const reposData = JSON.parse(reposText);
      console.log('Found Repos:', reposData.length);

      // Update profile in Supabase
      console.log('Updating profile in Supabase...');
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          ...profile,
          github_username: userData.login,
          updated_at: new Date().toISOString()
        });

      if (updateError) {
        console.error('Supabase Update Error:', updateError);
        throw updateError;
      }

      // Update repos in Supabase
      console.log('Updating repos in Supabase...');
      if (reposData.length > 0) {
        const repoInserts = reposData.map((repo: any) => ({
          repo_name: repo.name,
          repo_url: repo.html_url,
          description: repo.description || '',
          selected: false
        }));

        console.log('Inserting repos:', repoInserts);
        const { error: reposError } = await supabase
          .from('github_repos')
          .upsert(repoInserts, { onConflict: 'repo_url' });

        if (reposError) {
          console.error('Supabase Repos Error:', reposError);
          throw reposError;
        }
      }

      // Refresh data
      await fetchData();
      setError(null);
    } catch (err: any) {
      console.error('Validation Error:', err);
      setError(err.message || 'An error occurred');
    } finally {
      setIsValidatingToken(false);
    }
  };

  const toggleRepoSelection = async (repo: GithubRepo) => {
    try {
      const { error } = await supabase
        .from('github_repos')
        .update({ selected: !repo.selected })
        .eq('id', repo.id)

      if (error) throw error
      fetchData()
    } catch (err: any) {
      console.error('Error toggling repo selection:', err)
      setError(err.message)
    }
  }

  return (
    <main className="max-w-[1000px] mx-auto px-6 py-16">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/adminos/dashboard"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold">Edit Profile</h1>
      </div>

      <div className="max-w-2xl">
        {error && (
          <div className="flex items-center gap-2 p-4 mb-6 text-sm text-destructive bg-destructive/10 rounded-md">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-6">
            <h2 className="text-lg font-medium">Basic Information</h2>
            
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-muted-foreground mb-2">
                Name
              </label>
              <input
                type="text"
                id="name"
                value={profile.name}
                onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-muted-foreground mb-2">
                Title
              </label>
              <input
                type="text"
                id="title"
                value={profile.title}
                onChange={(e) => setProfile(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>

            <div>
              <label htmlFor="subtitle" className="block text-sm font-medium text-muted-foreground mb-2">
                Subtitle
              </label>
              <input
                type="text"
                id="subtitle"
                value={profile.subtitle}
                onChange={(e) => setProfile(prev => ({ ...prev, subtitle: e.target.value }))}
                className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-muted-foreground">
                  Present Text (Max 3 lines)
                </label>
                <button
                  type="button"
                  onClick={addPresentText}
                  className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80"
                  disabled={profile.present_text.length >= 3}
                >
                  <Plus className="w-4 h-4" />
                  Add Text
                </button>
              </div>
              <div className="space-y-3">
                {profile.present_text.slice(0, 3).map((text, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={text}
                      onChange={(e) => updatePresentText(index, e.target.value)}
                      className="flex-1 px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Enter text..."
                      required
                    />
                    <button
                      type="button"
                      onClick={() => removePresentText(index)}
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                      disabled={profile.present_text.length <= 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-lg font-medium">Social Media Links</h2>
            
            <div>
              <label htmlFor="twitter" className="block text-sm font-medium text-muted-foreground mb-2">
                Twitter
              </label>
              <input
                type="url"
                id="twitter"
                value={profile.social_links?.twitter || ''}
                onChange={(e) => setProfile(prev => ({
                  ...prev,
                  social_links: { ...prev.social_links, twitter: e.target.value }
                }))}
                className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="https://twitter.com/yourusername"
              />
            </div>

            <div>
              <label htmlFor="linkedin" className="block text-sm font-medium text-muted-foreground mb-2">
                LinkedIn
              </label>
              <input
                type="url"
                id="linkedin"
                value={profile.social_links?.linkedin || ''}
                onChange={(e) => setProfile(prev => ({
                  ...prev,
                  social_links: { ...prev.social_links, linkedin: e.target.value }
                }))}
                className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="https://linkedin.com/in/yourusername"
              />
            </div>

            <div>
              <label htmlFor="github" className="block text-sm font-medium text-muted-foreground mb-2">
                GitHub
              </label>
              <input
                type="url"
                id="github"
                value={profile.social_links?.github || ''}
                onChange={(e) => setProfile(prev => ({
                  ...prev,
                  social_links: { ...prev.social_links, github: e.target.value }
                }))}
                className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="https://github.com/yourusername"
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Buildings</h2>
              <button
                type="button"
                onClick={addBuilding}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded-md hover:bg-primary/90 transition-colors"
                disabled={buildings.length >= 5}
              >
                <Plus className="w-4 h-4" />
                Add Building
              </button>
            </div>

            <div className="space-y-4">
              {buildings.map((building) => (
                <div
                  key={building.id}
                  className="flex items-center justify-between p-4 bg-card rounded-lg border"
                >
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={building.title}
                      onChange={(e) => updateBuilding(building.id, { title: e.target.value })}
                      className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Title"
                    />
                    <input
                      type="text"
                      value={building.description}
                      onChange={(e) => updateBuilding(building.id, { description: e.target.value })}
                      className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Description"
                    />
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={building.external}
                          onChange={(e) => updateBuilding(building.id, { external: e.target.checked })}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-muted-foreground">External Link</span>
                      </label>
                      <input
                        type="number"
                        value={building.order_index}
                        onChange={(e) => updateBuilding(building.id, { order_index: parseInt(e.target.value) })}
                        className="w-20 px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                        min="0"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteBuilding(building.id)}
                    className="p-2 text-muted-foreground hover:text-destructive transition-colors ml-4"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {buildings.length === 0 && (
                <div className="text-center py-8 text-muted-foreground border rounded-lg">
                  No buildings yet. Click "Add Building" to create one.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-lg font-medium">GitHub Integration</h2>
            
            <div>
              <label htmlFor="github_token" className="block text-sm font-medium text-muted-foreground mb-2">
                GitHub Personal Access Token
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  id="github_token"
                  value={profile.github_token || ''}
                  onChange={(e) => setProfile(prev => ({
                    ...prev,
                    github_token: e.target.value
                  }))}
                  className="flex-1 px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                />
                <button
                  type="button"
                  onClick={validateGithubToken}
                  disabled={!profile.github_token || isValidatingToken}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isValidatingToken ? 'Validating...' : 'Validate'}
                </button>
              </div>
              {profile.github_username && (
                <div className="flex items-center gap-2 mt-2 text-sm text-green-600">
                  <Check className="w-4 h-4" />
                  Connected as @{profile.github_username}
                </div>
              )}
            </div>

            {profile.github_username && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Select up to 4 repositories to display in Open Source section
                </h3>
                <div className="space-y-2">
                  {githubRepos.map((repo) => (
                    <div
                      key={repo.id}
                      className="flex items-center justify-between p-3 bg-card rounded-lg border"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Github className="w-4 h-4 text-muted-foreground" />
                          <h4 className="font-medium">{repo.repo_name}</h4>
                        </div>
                        {repo.description && (
                          <p className="text-sm text-muted-foreground mt-1">{repo.description}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleRepoSelection(repo)}
                        disabled={!repo.selected && githubRepos.filter(r => r.selected).length >= 4}
                        className={`p-2 rounded-md transition-colors ${
                          repo.selected
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {repo.selected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </button>
                    </div>
                  ))}

                  {githubRepos.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground border rounded-lg">
                      No repositories found. Make sure your token has the correct permissions.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Link
              href="/adminos/dashboard"
              className="px-4 py-2 border rounded-md hover:bg-muted transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
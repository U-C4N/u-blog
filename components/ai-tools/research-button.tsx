'use client'

import { useState } from 'react'
import { BookOpen, Loader2 } from 'lucide-react'
import { researchTopic } from '@/lib/research'
import { generateArticle } from '@/lib/deepseek'
import { BlurBackground } from '../ui/blur-background'

interface ResearchButtonProps {
  onUpdate: (newContent: string) => void
}

export function ResearchButton({ onUpdate }: ResearchButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [topic, setTopic] = useState('')
  const [status, setStatus] = useState<'idle' | 'researching' | 'writing'>('idle')

  const handleGenerate = async () => {
    if (!topic.trim()) return
    
    try {
      setIsGenerating(true)
      setStatus('researching')
      
      const research = await researchTopic(topic)
      
      setStatus('writing')
      const generatedContent = await generateArticle(topic, research)
      
      onUpdate(generatedContent)
      setShowPrompt(false)
      setTopic('')
    } catch (error) {
      console.error('Error generating content:', error)
      alert('Failed to generate content. Please try again.')
    } finally {
      setIsGenerating(false)
      setStatus('idle')
    }
  }

  return (
    <>
      <button
        onClick={() => setShowPrompt(true)}
        disabled={isGenerating}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <BookOpen className="w-4 h-4" />
        Research & Write
      </button>

      <BlurBackground isVisible={showPrompt}>
        <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
          <h3 className="text-lg font-semibold mb-4">Generate Research Article</h3>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter topic or title..."
            className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 mb-4"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowPrompt(false)}
              className="px-4 py-2 text-sm border rounded-md hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !topic.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {status === 'researching' ? 'Researching...' : 'Writing...'}
                </>
              ) : (
                <>
                  <BookOpen className="w-4 h-4" />
                  Generate
                </>
              )}
            </button>
          </div>
        </div>
      </BlurBackground>
    </>
  )
}
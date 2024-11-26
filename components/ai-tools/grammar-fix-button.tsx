'use client'

import { useState } from 'react'
import { Wand2, Loader2 } from 'lucide-react'
import { fixGrammar } from '@/lib/deepseek'

interface GrammarFixButtonProps {
  content: string
  onUpdate: (newContent: string) => void
}

export function GrammarFixButton({ content, onUpdate }: GrammarFixButtonProps) {
  const [isFixingGrammar, setIsFixingGrammar] = useState(false)

  const handleGrammarFix = async () => {
    if (!content.trim()) return
    
    try {
      setIsFixingGrammar(true)
      const fixedContent = await fixGrammar(content)
      onUpdate(fixedContent)
    } catch (error) {
      console.error('Error fixing grammar:', error)
      alert('Failed to fix grammar. Please try again.')
    } finally {
      setIsFixingGrammar(false)
    }
  }

  return (
    <button
      onClick={handleGrammarFix}
      disabled={isFixingGrammar || !content.trim()}
      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isFixingGrammar ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Wand2 className="w-4 h-4" />
      )}
      Fix Grammar
    </button>
  )
}
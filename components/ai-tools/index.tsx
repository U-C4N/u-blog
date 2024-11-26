'use client'

import { GrammarFixButton } from './grammar-fix-button'
import { ResearchButton } from './research-button'
import { WordCounter } from './word-counter'

interface AIToolsProps {
  content: string
  onUpdate: (newContent: string) => void
}

export function AITools({ content, onUpdate }: AIToolsProps) {
  return (
    <>
      <div className="flex gap-2 mb-4">
        <GrammarFixButton content={content} onUpdate={onUpdate} />
        <ResearchButton onUpdate={onUpdate} />
      </div>
      <div className="relative">
        <textarea
          value={content}
          onChange={(e) => onUpdate(e.target.value)}
          rows={20}
          className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
          required
        />
        <div className="absolute bottom-2 right-2">
          <WordCounter content={content} />
        </div>
      </div>
    </>
  )
}
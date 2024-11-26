'use client'

import { useState } from 'react'

interface CodeBlockProps {
  code: string
  language?: string
}

export function CodeBlock({ code, language = 'markdown' }: CodeBlockProps) {
  const [showFullPrompt, setShowFullPrompt] = useState(false)

  return (
    <div className="rounded-lg border bg-card text-card-foreground my-8">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-medium">AI Prompt Preview:</h3>
        <button
          onClick={() => setShowFullPrompt(!showFullPrompt)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {showFullPrompt ? 'Hide Full Prompt' : 'Show Full Prompt'}
        </button>
      </div>
      <pre className={`p-4 overflow-x-auto ${!showFullPrompt ? 'max-h-[300px]' : ''}`}>
        <code className={`language-${language}`}>{code}</code>
      </pre>
    </div>
  )
}
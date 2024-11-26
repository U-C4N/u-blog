'use client'

interface WordCounterProps {
  content: string
}

export function WordCounter({ content }: WordCounterProps) {
  const wordCount = content.trim().split(/\s+/).length
  const readingTime = Math.ceil(wordCount / 200) // Assuming 200 words per minute

  return (
    <div className="text-xs text-muted-foreground space-x-2">
      <span>{wordCount} words</span>
      <span>•</span>
      <span>{readingTime} min read</span>
    </div>
  )
}
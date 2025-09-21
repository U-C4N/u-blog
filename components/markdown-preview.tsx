'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Copy, Eye, FileText, Download } from 'lucide-react'
import CopyButton from '@/components/copy-button'

// Simple markdown parser for basic syntax
function parseMarkdown(markdown: string): string {
  let html = markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-6 mb-3 first:mt-0">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-8 mb-4 first:mt-0">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-8 mb-4 first:mt-0">$1</h1>')
    // Bold and Italic
    .replace(/\*\*\*(.*)\*\*\*/gim, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    // Code blocks
    .replace(/```([\s\S]*?)```/gim, '<pre class="bg-muted p-4 rounded-lg my-4 overflow-x-auto"><code>$1</code></pre>')
    // Inline code
    .replace(/`([^`]*)`/gim, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm">$1</code>')
    // Links
    .replace(/\[([^\]]*)\]\(([^\)]*)\)/gim, '<a href="$2" class="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">$1</a>')
    // Lists
    .replace(/^\* (.*$)/gim, '<li class="ml-4">$1</li>')
    .replace(/^\- (.*$)/gim, '<li class="ml-4">$1</li>')
    .replace(/^(\d+)\. (.*$)/gim, '<li class="ml-4">$2</li>')
    // Line breaks
    .replace(/\r?\n\r?\n/gim, '</p><p class="mb-4">')
    .replace(/\r?\n/gim, '<br>')

  // Wrap in paragraphs and handle lists
  html = html.replace(/(<li.*<\/li>)/g, (match) => {
    const items = match.split('</li>')
    items.pop() // Remove empty last element
    return '<ul class="list-disc list-inside space-y-1 mb-4">' + items.join('</li>') + '</li></ul>'
  })

  return '<div class="prose prose-sm max-w-none"><p class="mb-4">' + html + '</p></div>'
}

const defaultMarkdown = `# Markdown Preview Tool

Use this tool to preview your **markdown** content instantly.

## Supported Features

- **Bold text** and *italic text*
- \`inline code\` snippets
- [Links](https://example.com)
- List items

### Code Blocks

\`\`\`
function hello() {
  console.log("Hello World!");
}
\`\`\`

Experiment with your markdown here and see the changes live.`

export default function MarkdownPreview() {
  const [markdown, setMarkdown] = useState(defaultMarkdown)
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write')

  const htmlPreview = useMemo(() => parseMarkdown(markdown), [markdown])

  const downloadMarkdown = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'preview.md'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            Markdown Editor
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <CopyButton content={markdown} className="h-8" />
          <Button
            onClick={downloadMarkdown}
            variant="outline" 
            size="sm"
            className="h-8"
          >
            <Download className="w-3 h-3 mr-1" />
            Download
          </Button>
        </div>
      </div>

      {/* Mobile: Tabs, Desktop: Side by side */}
      <div className="block lg:hidden">
        <div className="flex border-b border-border mb-4">
          <button
            onClick={() => setActiveTab('write')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'write'
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Write
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'preview'
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Eye className="w-4 h-4 inline mr-2" />
            Preview
          </button>
        </div>

        <div className="min-h-[400px]">
          {activeTab === 'write' ? (
            <textarea
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              className="w-full h-[400px] p-4 border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-sm font-mono"
              placeholder="Write your markdown here..."
            />
          ) : (
            <Card className="h-[400px]">
              <CardContent className="p-4 h-full overflow-y-auto">
                <div
                  dangerouslySetInnerHTML={{ __html: htmlPreview }}
                  className="prose prose-sm max-w-none"
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Desktop: Side by side */}
      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4" />
            <h3 className="font-medium">Markdown</h3>
          </div>
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            className="w-full h-[500px] p-4 border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-ring focus-border-transparent text-sm font-mono"
            placeholder="Write your markdown here..."
          />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-4 h-4" />
            <h3 className="font-medium">Preview</h3>
          </div>
          <Card className="h-[500px]">
            <CardContent className="p-4 h-full overflow-y-auto">
              <div
                dangerouslySetInnerHTML={{ __html: htmlPreview }}
                className="prose prose-sm max-w-none"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Tip: This tool supports fundamental Markdown syntax including headings, bold and italic text, code blocks, lists, and links.
      </div>
    </div>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Code2, Palette, Calculator, ArrowRight, Box, ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Tools | U-BLOG',
  description: 'Useful development and productivity tools',
}

const tools = [
  {
    id: 'markdown-preview',
    title: 'Markdown Preview',
    description: 'Preview and edit your Markdown content live. Test your writing with real-time rendering.',
    href: '/tools/markdown-preview',
    icon: FileText,
    category: 'Writing',
    tags: ['markdown', 'preview', 'writing'],
    status: 'active' as const
  },
  {
    id: 'glsl-previewer',
    title: 'GLSL Shader Previewer',
    description: 'Write and preview GLSL fragment shaders in real-time. Live rendering with WebGL.',
    href: '/tools/glsl-previewer',
    icon: Palette,
    category: 'Graphics',
    tags: ['glsl', 'shader', 'webgl', 'graphics'],
    status: 'active' as const
  },
  {
    id: 'threejs-previewer',
    title: 'Three.js Previewer',
    description: 'Create and preview 3D scenes with Three.js. Real-time 3D rendering and live code editing.',
    href: '/tools/threejs-previewer',
    icon: Box,
    category: 'Graphics',
    tags: ['threejs', '3d', 'webgl', 'graphics'],
    status: 'active' as const
  },
  {
    id: 'code-formatter',
    title: 'Code Formatter',
    description: 'Format and beautify your JavaScript, TypeScript, CSS and HTML code.',
    href: '/tools/code-formatter',
    icon: Code2,
    category: 'Development',
    tags: ['javascript', 'typescript', 'formatting'],
    status: 'coming-soon' as const
  },
  {
    id: 'color-palette',
    title: 'Color Palette Generator',
    description: 'Create beautiful color palettes and get hex codes. Color harmony for your designs.',
    href: '/tools/color-palette',
    icon: Palette,
    category: 'Design',
    tags: ['colors', 'design', 'palette'],
    status: 'coming-soon' as const
  },
  {
    id: 'unit-converter',
    title: 'Unit Converter',
    description: 'Easily convert different units of measurement. Pixels, rem, em and other CSS units.',
    href: '/tools/unit-converter',
    icon: Calculator,
    category: 'Utility',
    tags: ['conversion', 'css', 'units'],
    status: 'coming-soon' as const
  }
]

export default function ToolsPage() {
  return (
    <main className="max-w-[1000px] mx-auto px-4 sm:px-6 py-12 sm:py-20">
      {/* Back to Homepage Button */}
      <div className="mb-8">
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Homepage
        </Link>
      </div>
      
      <header className="mb-12 sm:mb-20">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">Tools</h1>
        <p className="text-base sm:text-lg text-muted-foreground">
          Useful tools for developers and content creators. Designed to accelerate your workflow.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tools.map((tool) => {
          const Icon = tool.icon
          const isActive = tool.status === 'active'
          
          return (
            <Card key={tool.id} className="group relative overflow-hidden hover:shadow-md transition-all duration-200">
              {isActive ? (
                <Link href={tool.href} className="block h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted/50 group-hover:bg-muted transition-colors">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg group-hover:text-foreground/80 transition-colors">
                            {tool.title}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {tool.category}
                            </Badge>
                            <Badge variant="default" className="text-xs bg-green-100 text-green-800 hover:bg-green-100">
                              Ready
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardDescription className="text-sm leading-relaxed mb-3">
                      {tool.description}
                    </CardDescription>
                    <div className="flex flex-wrap gap-1">
                      {tool.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-muted/50 text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Link>
              ) : (
                <div className="h-full cursor-not-allowed opacity-60">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted/30">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {tool.title}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {tool.category}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              Coming Soon
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardDescription className="text-sm leading-relaxed mb-3">
                      {tool.description}
                    </CardDescription>
                    <div className="flex flex-wrap gap-1">
                      {tool.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-muted/30 text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      <div className="mt-12 p-6 bg-muted/30 rounded-lg border border-border/40">
        <h3 className="font-medium mb-2">🚀 More Tools Coming</h3>
        <p className="text-sm text-muted-foreground">
          More useful tools will be added soon. If you have suggestions{' '}
          <a href="mailto:contact@example.com" className="text-foreground hover:underline">
            get in touch
          </a>
          .
        </p>
      </div>
    </main>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Code2, Palette, Calculator, ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Tools | U-BLOG',
  description: 'Useful development and productivity tools',
}

const tools = [
  {
    id: 'markdown-preview',
    title: 'Markdown Preview',
    description: 'Markdown içeriğinizi canlı olarak önizleyin ve düzenleyin. Gerçek zamanlı render ile yazılarınızı test edin.',
    href: '/tools/markdown-preview',
    icon: FileText,
    category: 'Writing',
    tags: ['markdown', 'preview', 'writing'],
    status: 'active' as const
  },
  {
    id: 'glsl-previewer',
    title: 'GLSL Shader Previewer',
    description: 'GLSL fragment shader\'larınızı gerçek zamanlı olarak yazın ve önizleyin. WebGL ile canlı rendering.',
    href: '/tools/glsl-previewer',
    icon: Palette,
    category: 'Graphics',
    tags: ['glsl', 'shader', 'webgl', 'graphics'],
    status: 'active' as const
  },
  {
    id: 'code-formatter',
    title: 'Code Formatter',
    description: 'JavaScript, TypeScript, CSS ve HTML kodlarınızı düzenleyin ve formatlayın.',
    href: '/tools/code-formatter',
    icon: Code2,
    category: 'Development',
    tags: ['javascript', 'typescript', 'formatting'],
    status: 'coming-soon' as const
  },
  {
    id: 'color-palette',
    title: 'Color Palette Generator',
    description: 'Güzel renk paletleri oluşturun ve hex kodlarını alın. Tasarımlarınız için renk harmony\'si.',
    href: '/tools/color-palette',
    icon: Palette,
    category: 'Design',
    tags: ['colors', 'design', 'palette'],
    status: 'coming-soon' as const
  },
  {
    id: 'unit-converter',
    title: 'Unit Converter',
    description: 'Farklı ölçü birimlerini kolayca dönüştürün. Pixel, rem, em ve diğer CSS birimleri.',
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
      <header className="mb-12 sm:mb-20">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">Tools</h1>
        <p className="text-base sm:text-lg text-muted-foreground">
          Geliştiriciler ve içerik üreticileri için faydalı araçlar. İş akışınızı hızlandırmak için tasarlandı.
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
                              Hazır
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
                              Yakında
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
        <h3 className="font-medium mb-2">🚀 Daha Fazla Tool Geliyor</h3>
        <p className="text-sm text-muted-foreground">
          Yakında daha fazla faydalı araç eklenecek. Öneriniz varsa{' '}
          <a href="mailto:contact@example.com" className="text-foreground hover:underline">
            iletişime geçin
          </a>
          .
        </p>
      </div>
    </main>
  )
}

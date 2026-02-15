export interface ToolConfig {
  id: string
  title: string
  description: string
  href: string
  iconName: string
  category: string
  tags: string[]
  status: 'active' | 'coming-soon'
}

export const TOOLS: ToolConfig[] = [
  {
    id: 'markdown-preview',
    title: 'Markdown Preview',
    description: 'Preview and edit your Markdown content live. Test your writing with real-time rendering.',
    href: '/tools/markdown-preview',
    iconName: 'FileText',
    category: 'Writing',
    tags: ['markdown', 'preview', 'writing'],
    status: 'active'
  },
  {
    id: 'glsl-previewer',
    title: 'GLSL Shader Previewer',
    description: 'Write and preview GLSL fragment shaders in real-time. Live rendering with WebGL.',
    href: '/tools/glsl-previewer',
    iconName: 'Palette',
    category: 'Graphics',
    tags: ['glsl', 'shader', 'webgl', 'graphics'],
    status: 'active'
  },
  {
    id: 'threejs-previewer',
    title: 'Three.js Previewer',
    description: 'Create and preview 3D scenes with Three.js. Real-time 3D rendering and live code editing.',
    href: '/tools/threejs-previewer',
    iconName: 'Box',
    category: 'Graphics',
    tags: ['threejs', '3d', 'webgl', 'graphics'],
    status: 'active'
  },
  {
    id: 'code-formatter',
    title: 'Code Formatter',
    description: 'Format and beautify your JavaScript, TypeScript, CSS and HTML code.',
    href: '/tools/code-formatter',
    iconName: 'Code2',
    category: 'Development',
    tags: ['javascript', 'typescript', 'formatting'],
    status: 'coming-soon'
  },
  {
    id: 'color-palette',
    title: 'Color Palette Generator',
    description: 'Create beautiful color palettes and get hex codes. Color harmony for your designs.',
    href: '/tools/color-palette',
    iconName: 'Palette',
    category: 'Design',
    tags: ['colors', 'design', 'palette'],
    status: 'coming-soon'
  },
  {
    id: 'unit-converter',
    title: 'Unit Converter',
    description: 'Easily convert different units of measurement. Pixels, rem, em and other CSS units.',
    href: '/tools/unit-converter',
    iconName: 'Calculator',
    category: 'Utility',
    tags: ['conversion', 'css', 'units'],
    status: 'coming-soon'
  }
]

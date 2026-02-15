'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sparkles, Code2, Eye } from 'lucide-react'
import GLSLCanvas, { GLSLCanvasRef } from '@/components/glsl-canvas'
import GLSLEditor from '@/components/glsl-editor'
import UniformControls from '@/components/uniform-controls'

interface ShaderTemplate {
  id: string
  name: string
  description: string
  code: string
}

const shaderTemplates: ShaderTemplate[] = [
  {
    id: 'basic',
    name: 'Basic Gradient',
    description: 'Simple color gradient',
    code: `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec3 color = vec3(uv, 0.5 + 0.5 * sin(iTime));
    fragColor = vec4(color, 1.0);
}`
  },
  {
    id: 'animated',
    name: 'Animated Circles',
    description: 'Animated colorful circles',
    code: `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(uv, center);
    
    float circle = sin(dist * 10.0 - iTime * 2.0) * 0.5 + 0.5;
    vec3 color = vec3(circle) * vec3(uv, sin(iTime));
    
    fragColor = vec4(color, 1.0);
}`
  },
  {
    id: 'mandelbrot',
    name: 'Mandelbrot Set',
    description: 'Classic fractal pattern',
    code: `vec2 complexMult(vec2 a, vec2 b) {
    return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / min(iResolution.x, iResolution.y);
    uv *= 3.0;
    
    vec2 z = vec2(0.0);
    vec2 c = uv;
    
    int iterations = 0;
    for (int i = 0; i < 100; i++) {
        if (length(z) > 2.0) break;
        z = complexMult(z, z) + c;
        iterations++;
    }
    
    float color = float(iterations) / 100.0;
    fragColor = vec4(vec3(color), 1.0);
}`
  }
]

const defaultShader = shaderTemplates[0].code

export default function GLSLPreviewer() {
  const [shaderCode, setShaderCode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tool-glsl-code') || defaultShader
    }
    return defaultShader
  })
  const [selectedTemplate, setSelectedTemplate] = useState('basic')
  const [isPlaying, setIsPlaying] = useState(true)
  const [compileError, setCompileError] = useState<string | null>(null)
  const canvasRef = useRef<GLSLCanvasRef>(null)

  // Analytics: track tool view on mount
  useEffect(() => {
    const g = (window as unknown as Record<string, unknown>).gtag as ((...args: unknown[]) => void) | undefined
    g?.('event', 'tool_view', { tool_name: 'glsl-previewer' })
  }, [])

  // Debounced auto-save to localStorage
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem('tool-glsl-code', shaderCode)
    }, 1000)
    return () => clearTimeout(timeoutId)
  }, [shaderCode])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCompileError(null)
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [shaderCode])

  const handleTemplateChange = useCallback((templateId: string) => {
    const template = shaderTemplates.find(t => t.id === templateId)
    if (template) {
      setShaderCode(template.code)
      setSelectedTemplate(templateId)
      setCompileError(null)
      const g = (window as unknown as Record<string, unknown>).gtag as ((...args: unknown[]) => void) | undefined
      g?.('event', 'template_change', { tool_name: 'glsl-previewer', template_id: templateId })
    }
  }, [])

  // Use functional setState to avoid dependency on isPlaying (stable callback)
  const handlePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev)
  }, [])

  const handleReset = useCallback(() => {
    canvasRef.current?.reset()
  }, [])

  const handleShaderError = useCallback((error: string) => {
    setCompileError(error)
  }, [])

  // Keyboard shortcuts: Space = play/pause, R = reset (only when not in editor)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || '').toLowerCase()
      const isEditing = tag === 'input' || tag === 'textarea' || document.activeElement?.closest('.monaco-editor')
      if (isEditing) return

      if (e.code === 'Space') {
        e.preventDefault()
        setIsPlaying(prev => !prev)
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        canvasRef.current?.reset()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="font-medium">Real-time GLSL Editor</span>
          <Badge variant="secondary" className="text-xs">
            WebGL Powered
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {shaderTemplates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{template.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {template.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Interface */}
      <ResizablePanelGroup direction="horizontal" className="min-h-[600px] max-h-[600px] rounded-lg border">
        <ResizablePanel defaultSize={50} minSize={30}>
          <GLSLEditor 
            value={shaderCode}
            onChange={setShaderCode}
            error={compileError}
            className="h-full border-0 rounded-none"
          />
        </ResizablePanel>
        
        <ResizableHandle withHandle />
        
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col">
            <GLSLCanvas
              ref={canvasRef}
              fragmentShader={shaderCode}
              isPlaying={isPlaying}
              className="flex-1 h-full"
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Bottom Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <Code2 className="w-4 h-4" />
              GLSL Fragment Shader
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              This editor supports Shadertoy-style GLSL fragment shaders. 
              Define your logic inside the <code className="bg-background px-1 rounded text-xs">mainImage</code> function.
            </p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Available uniforms:</strong></p>
              <ul className="ml-4 space-y-0.5">
                <li>- <code>iResolution</code> - Screen resolution (vec2)</li>
                <li>- <code>iTime</code> - Elapsed time (float)</li>
                <li>- <code>iMouse</code> - Mouse position (vec2)</li>
              </ul>
            </div>
          </div>
        </div>
        
        <UniformControls 
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
          onReset={handleReset}
        />
      </div>
    </div>
  )
}

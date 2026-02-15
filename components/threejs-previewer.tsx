'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Box, Code2, Eye, Play, Pause, RotateCcw } from 'lucide-react'
import ThreeJSCanvas, { ThreeJSCanvasRef } from '@/components/threejs-canvas-wrapper'
import ThreeJSEditor from '@/components/threejs-editor'

interface CodeTemplate {
  id: string
  name: string
  description: string
  code: string
}

const codeTemplates: CodeTemplate[] = [
  {
    id: 'rotating-cube',
    name: 'Rotating Cube',
    description: 'Basic rotating cube with lighting',
    code: `// Create a rotating cube
const geometry = new THREE.BoxGeometry()
const material = new THREE.MeshLambertMaterial({ color: 0x00ff00 })
const cube = createMesh(geometry, material)

// Animation loop
const animate = () => {
  const time = clock.getElapsedTime()
  cube.rotation.x = time
  cube.rotation.y = time * 0.5
  requestAnimationFrame(animate)
}

animate()`
  },
  {
    id: 'colorful-spheres',
    name: 'Colorful Spheres',
    description: 'Multiple animated spheres with different colors',
    code: `// Create multiple colorful spheres
const spheres = []
const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff]

for (let i = 0; i < 5; i++) {
  const geometry = new THREE.SphereGeometry(0.5, 32, 32)
  const material = new THREE.MeshLambertMaterial({ color: colors[i] })
  const sphere = createMesh(geometry, material)
  
  // Position spheres in a circle
  const angle = (i / 5) * Math.PI * 2
  sphere.position.x = Math.cos(angle) * 3
  sphere.position.z = Math.sin(angle) * 3
  
  spheres.push(sphere)
}

// Animation loop
const animate = () => {
  const time = clock.getElapsedTime()
  
  spheres.forEach((sphere, index) => {
    sphere.rotation.x = time + index
    sphere.rotation.y = time * 0.5 + index
    sphere.position.y = Math.sin(time + index) * 0.5
  })
  
  requestAnimationFrame(animate)
}

animate()`
  },
  {
    id: 'wireframe-torus',
    name: 'Wireframe Torus',
    description: 'Animated wireframe torus with dynamic scaling',
    code: `// Create a wireframe torus
const geometry = new THREE.TorusGeometry(2, 0.5, 16, 100)
const material = new THREE.MeshBasicMaterial({ 
  color: 0x00ffff, 
  wireframe: true 
})
const torus = createMesh(geometry, material)

// Animation loop
const animate = () => {
  const time = clock.getElapsedTime()
  
  torus.rotation.x = time * 0.5
  torus.rotation.y = time * 0.3
  
  // Pulsing effect
  const scale = 1 + Math.sin(time * 2) * 0.3
  torus.scale.setScalar(scale)
  
  requestAnimationFrame(animate)
}

animate()`
  },
  {
    id: 'particle-system',
    name: 'Particle System',
    description: 'Simple particle system with points',
    code: `// Create particle system
const particleCount = 1000
const particles = new THREE.BufferGeometry()
const positions = new Float32Array(particleCount * 3)
const colors = new Float32Array(particleCount * 3)

for (let i = 0; i < particleCount * 3; i += 3) {
  // Random positions
  positions[i] = (Math.random() - 0.5) * 10
  positions[i + 1] = (Math.random() - 0.5) * 10
  positions[i + 2] = (Math.random() - 0.5) * 10
  
  // Random colors
  colors[i] = Math.random()
  colors[i + 1] = Math.random()
  colors[i + 2] = Math.random()
}

particles.setAttribute('position', new THREE.BufferAttribute(positions, 3))
particles.setAttribute('color', new THREE.BufferAttribute(colors, 3))

const material = new THREE.PointsMaterial({
  size: 0.05,
  vertexColors: true
})

const particleSystem = new THREE.Points(particles, material)
scene.add(particleSystem)

// Animation loop
const animate = () => {
  const time = clock.getElapsedTime()
  
  particleSystem.rotation.x = time * 0.1
  particleSystem.rotation.y = time * 0.2
  
  requestAnimationFrame(animate)
}

animate()`
  }
]

const defaultCode = codeTemplates[0].code

export default function ThreeJSPreviewer() {
  const [code, setCode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tool-threejs-code') || defaultCode
    }
    return defaultCode
  })
  const [selectedTemplate, setSelectedTemplate] = useState('rotating-cube')
  const [isPlaying, setIsPlaying] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const canvasRef = useRef<ThreeJSCanvasRef>(null)

  // Analytics: track tool view on mount
  useEffect(() => {
    const g = (window as unknown as Record<string, unknown>).gtag as ((...args: unknown[]) => void) | undefined
    g?.('event', 'tool_view', { tool_name: 'threejs-previewer' })
  }, [])

  // Debounced auto-save to localStorage
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem('tool-threejs-code', code)
    }, 1000)
    return () => clearTimeout(timeoutId)
  }, [code])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setError(null)
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [code])
  const handleTemplateChange = useCallback((templateId: string) => {
    const template = codeTemplates.find(t => t.id === templateId)
    if (template) {
      setCode(template.code)
      setSelectedTemplate(templateId)
      setError(null)
      const g = (window as unknown as Record<string, unknown>).gtag as ((...args: unknown[]) => void) | undefined
      g?.('event', 'template_change', { tool_name: 'threejs-previewer', template_id: templateId })
    }
  }, [])

  const handlePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev)
  }, [])

  const handleReset = useCallback(() => {
    canvasRef.current?.reset()
  }, [])

  const handleError = useCallback((error: string | null) => {
    setError(error)
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
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500 rounded-lg">
            <Box className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-semibold text-lg">Three.js Studio</span>
            <p className="text-sm text-muted-foreground">Real-time 3D scene editor</p>
          </div>
          <Badge variant="secondary" className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
            WebGL Powered
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
            <SelectTrigger className="w-52 bg-white dark:bg-gray-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {codeTemplates.map((template) => (
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
      <ResizablePanelGroup direction="horizontal" className="min-h-[650px] max-h-[650px] rounded-lg border shadow-lg bg-white dark:bg-gray-900">
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full border-r border-gray-200 dark:border-gray-700">
            <ThreeJSEditor 
              value={code}
              onChange={setCode}
              error={error}
              className="h-full border-0 rounded-none"
            />
          </div>
        </ResizablePanel>
        
        <ResizableHandle withHandle className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700" />
        
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-500" />
                  <span className="font-medium text-sm">3D Preview</span>
                </div>
                <Button 
                  onClick={handleReset}
                  size="sm"
                  variant="outline"
                  className="h-7 px-3 text-xs"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset
                </Button>
              </div>
            </div>
            <ThreeJSCanvas 
              ref={canvasRef}
              code={code}
              onError={handleError}
              className="flex-1 h-full"
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Bottom Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-700">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-blue-900 dark:text-blue-100">
              <Code2 className="w-5 h-5" />
              Three.js Code Editor
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
              Write Three.js JavaScript code with full access to the Three.js library. 
              Changes are applied in real-time to the 3D scene.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <p className="font-medium text-blue-800 dark:text-blue-200">Available Globals:</p>
                <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                    <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded text-xs">THREE</code> - Complete Three.js library
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                    <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded text-xs">scene</code> - Main scene object
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                    <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded text-xs">camera</code> - Perspective camera
                  </li>
                </ul>
              </div>
              <div className="space-y-2">
                <p className="font-medium text-blue-800 dark:text-blue-200">Helper Functions:</p>
                <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                    <code className="bg-green-100 dark:bg-green-900 px-1 rounded text-xs">createMesh()</code> - Add mesh to scene
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                    <code className="bg-green-100 dark:bg-green-900 px-1 rounded text-xs">createLight()</code> - Add light to scene
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                    <code className="bg-green-100 dark:bg-green-900 px-1 rounded text-xs">clock</code> - Time management
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-6 border border-purple-200 dark:border-purple-700">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-purple-900 dark:text-purple-100">
            <Eye className="w-5 h-5" />
            Quick Tips
          </h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-xs font-medium text-purple-800 dark:text-purple-200">Animation:</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <p>- Use <code className="bg-purple-100 dark:bg-purple-900 px-1 rounded">requestAnimationFrame</code></p>
                <p>- Access time: <code className="bg-purple-100 dark:bg-purple-900 px-1 rounded">clock.getElapsedTime()</code></p>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-xs font-medium text-purple-800 dark:text-purple-200">Scene Setup:</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <p>- Camera at (0, 0, 5)</p>
                <p>- Ambient + directional lighting</p>
                <p>- Dark scene background</p>
              </div>
            </div>
            
            <div className="pt-2 border-t border-purple-200 dark:border-purple-700">
              <Button 
                onClick={handleReset}
                size="sm"
                variant="outline"
                className="w-full bg-white dark:bg-gray-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 border-purple-300 dark:border-purple-600"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Scene
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

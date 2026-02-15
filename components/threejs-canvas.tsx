'use client'

import { useRef, useEffect, forwardRef, useImperativeHandle, useState, useCallback } from 'react'
// Full namespace import is intentional: THREE is passed to user-provided code via new Function().
// Tree-shaking is handled at the bundle level by the dynamic import in threejs-canvas-wrapper.tsx (ssr: false).
import * as THREE from 'three'
import { cn } from '@/lib/utils'

export interface ThreeJSCanvasRef {
  reset: () => void
  updateCode: (code: string) => void
}

interface ThreeJSCanvasProps {
  code: string
  className?: string
  onError?: (error: string | null) => void
}

const ThreeJSCanvas = forwardRef<ThreeJSCanvasRef, ThreeJSCanvasProps>(
  ({ code, className, onError }, ref) => {
    const mountRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<THREE.Scene | null>(null)
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
    const animationRef = useRef<number | null>(null)
    const userObjectsRef = useRef<THREE.Object3D[]>([])
    const userAnimationFramesRef = useRef<number[]>([])
    const clockRef = useRef<THREE.Clock>(new THREE.Clock())
    const reducedMotionRef = useRef<boolean>(false)
    const [mounted, setMounted] = useState(false)
    const [contextLost, setContextLost] = useState(false)

    const disposeObject = useCallback((obj: THREE.Object3D) => {
      if (obj instanceof THREE.Mesh) {
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) {
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material]
          for (const mat of materials) {
            for (const value of Object.values(mat)) {
              if (value instanceof THREE.Texture) {
                value.dispose()
              }
            }
            mat.dispose()
          }
        }
      }
    }, [])

    const clearUserObjects = useCallback(() => {
      userAnimationFramesRef.current.forEach(id => cancelAnimationFrame(id))
      userAnimationFramesRef.current = []

      userObjectsRef.current.forEach(obj => {
        disposeObject(obj)
        sceneRef.current?.remove(obj)
      })
      userObjectsRef.current = []
    }, [disposeObject])

    const executeUserCode = useCallback((userCode: string) => {
      try {
        clearUserObjects()

        if (!sceneRef.current || !rendererRef.current || !cameraRef.current) return

        const scene = sceneRef.current
        const renderer = rendererRef.current
        const camera = cameraRef.current
        const clock = clockRef.current

        const createMesh = (geometry: THREE.BufferGeometry, material: THREE.Material) => {
          const mesh = new THREE.Mesh(geometry, material)
          userObjectsRef.current.push(mesh)
          scene.add(mesh)
          return mesh
        }

        const createLight = (light: THREE.Light) => {
          userObjectsRef.current.push(light)
          scene.add(light)
          return light
        }

        const func = new Function(
          'THREE',
          'scene',
          'camera',
          'renderer',
          'clock',
          'createMesh',
          'createLight',
          userCode
        )

        let completed = false
        const timeoutId = setTimeout(() => {
          if (!completed) {
            onError?.('Code execution timed out (>5s). Possible infinite loop.')
          }
        }, 5000)

        try {
          func(THREE, scene, camera, renderer, clock, createMesh, createLight)
          completed = true
          clearTimeout(timeoutId)
          onError?.(null)
        } catch (execError) {
          completed = true
          clearTimeout(timeoutId)
          throw execError
        }
      } catch (error) {
        console.error('Three.js code execution error:', error)
        onError?.(error instanceof Error ? error.message : 'Unknown error')
      }
    }, [onError, clearUserObjects])

    const animate = useCallback(() => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return

      try {
        rendererRef.current.render(sceneRef.current, cameraRef.current)
        // If reduced motion is preferred, render one frame then stop
        if (!reducedMotionRef.current) {
          animationRef.current = requestAnimationFrame(animate)
        } else {
          animationRef.current = null
        }
      } catch (error) {
        console.error('Animation error:', error)
      }
    }, [])

    useImperativeHandle(ref, () => ({
      reset: () => {
        clockRef.current.start()
        clearUserObjects()
      },
      updateCode: (newCode: string) => {
        executeUserCode(newCode)
      }
    }))

    useEffect(() => {
      setMounted(true)
      if (typeof window !== 'undefined') {
        reducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      }
    }, [])

    useEffect(() => {
      if (!mounted) return

      const mountElement = mountRef.current
      if (!mountElement) return

      const initialWidth = mountElement.clientWidth || 1
      const initialHeight = mountElement.clientHeight || 1

      // Initialize Three.js scene
      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0x111111)
      sceneRef.current = scene

      // Initialize camera
      const camera = new THREE.PerspectiveCamera(
        75,
        initialWidth / initialHeight,
        0.1,
        1000
      )
      camera.position.z = 5
      cameraRef.current = camera

      // Initialize renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true })
      renderer.setSize(initialWidth, initialHeight)
      if (typeof window !== 'undefined') {
        renderer.setPixelRatio(window.devicePixelRatio)
      }
      mountElement.appendChild(renderer.domElement)
      rendererRef.current = renderer

      // Handle WebGL context loss/restore
      const handleContextLost = (e: Event) => {
        e.preventDefault()
        setContextLost(true)
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current)
          animationRef.current = null
        }
      }

      const handleContextRestored = () => {
        setContextLost(false)
        animate()
      }

      renderer.domElement.addEventListener('webglcontextlost', handleContextLost)
      renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored)

      // Add basic lighting
      const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
      scene.add(ambientLight)
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
      directionalLight.position.set(1, 1, 1)
      scene.add(directionalLight)

      // Start animation loop
      animate()

      // Handle resize
      const handleResize = () => {
        if (!camera || !renderer) return

        const width = mountElement.clientWidth
        const height = mountElement.clientHeight || 1

        camera.aspect = width / height
        camera.updateProjectionMatrix()
        renderer.setSize(width, height)
      }

      if (typeof window !== 'undefined') {
        window.addEventListener('resize', handleResize)
      }

      return () => {
        if (typeof window !== 'undefined') {
          window.removeEventListener('resize', handleResize)
        }

        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current)
        }

        // Cancel user animation frames
        userAnimationFramesRef.current.forEach(id => cancelAnimationFrame(id))
        userAnimationFramesRef.current = []

        renderer.domElement.removeEventListener('webglcontextlost', handleContextLost)
        renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored)

        renderer.dispose()
        if (renderer.domElement.parentElement === mountElement) {
          mountElement.removeChild(renderer.domElement)
        }

        rendererRef.current = null
        sceneRef.current = null
        cameraRef.current = null
      }
    }, [mounted, animate])
    useEffect(() => {
      executeUserCode(code)
    }, [code, executeUserCode])

    return (
      <div
        ref={mountRef}
        role="img"
        aria-label="Three.js 3D scene preview"
        className={cn(
          "w-full h-full bg-gradient-to-br from-gray-900 to-black rounded-lg overflow-hidden border border-gray-800 relative",
          className
        )}
        style={{ minHeight: '400px' }}
      >
        {contextLost && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
            <div className="text-center p-6 max-w-sm">
              <p className="text-yellow-400 font-medium mb-2">WebGL Context Lost</p>
              <p className="text-sm text-gray-400">
                The browser lost the GPU context. Waiting for automatic recovery...
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }
)

ThreeJSCanvas.displayName = 'ThreeJSCanvas'

export default ThreeJSCanvas
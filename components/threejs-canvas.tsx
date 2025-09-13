'use client'

import { useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react'
import * as THREE from 'three'
import { cn } from '@/lib/utils'

export interface ThreeJSCanvasRef {
  reset: () => void
  updateCode: (code: string) => void
}

interface ThreeJSCanvasProps {
  code: string
  className?: string
  onError?: (error: string) => void
}

const ThreeJSCanvas = forwardRef<ThreeJSCanvasRef, ThreeJSCanvasProps>(
  ({ code, className, onError }, ref) => {
    const mountRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<THREE.Scene | null>(null)
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
    const animationRef = useRef<number | null>(null)
    const userObjectsRef = useRef<THREE.Object3D[]>([])
    const clockRef = useRef<THREE.Clock>(new THREE.Clock())
    const [mounted, setMounted] = useState(false)

    const executeUserCode = (userCode: string) => {
      try {
        // Clear previous user objects
        userObjectsRef.current.forEach(obj => {
          sceneRef.current?.remove(obj)
        })
        userObjectsRef.current = []

        if (!sceneRef.current || !rendererRef.current || !cameraRef.current) return

        // Create a safe execution context
        const scene = sceneRef.current
        const renderer = rendererRef.current
        const camera = cameraRef.current
        const clock = clockRef.current

        // Helper functions for users
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

        // Execute user code with available Three.js objects
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

        func(THREE, scene, camera, renderer, clock, createMesh, createLight)
        onError?.(null)
      } catch (error) {
        console.error('Three.js code execution error:', error)
        onError?.(error instanceof Error ? error.message : 'Unknown error')
      }
    }

    const animate = () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return

      try {
        rendererRef.current.render(sceneRef.current, cameraRef.current)
        animationRef.current = requestAnimationFrame(animate)
      } catch (error) {
        console.error('Animation error:', error)
      }
    }

    useImperativeHandle(ref, () => ({
      reset: () => {
        clockRef.current.start()
        if (sceneRef.current) {
          userObjectsRef.current.forEach(obj => {
            sceneRef.current?.remove(obj)
          })
          userObjectsRef.current = []
        }
      },
      updateCode: (newCode: string) => {
        executeUserCode(newCode)
      }
    }))

    useEffect(() => {
      setMounted(true)
    }, [])

    useEffect(() => {
      if (!mountRef.current || !mounted) return

      // Initialize Three.js scene
      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0x111111)
      sceneRef.current = scene

      // Initialize camera
      const camera = new THREE.PerspectiveCamera(
        75,
        mountRef.current.clientWidth / mountRef.current.clientHeight,
        0.1,
        1000
      )
      camera.position.z = 5
      cameraRef.current = camera

      // Initialize renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true })
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight)
      if (typeof window !== 'undefined') {
        renderer.setPixelRatio(window.devicePixelRatio)
      }
      mountRef.current.appendChild(renderer.domElement)
      rendererRef.current = renderer

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
        if (!mountRef.current || !camera || !renderer) return
        
        const width = mountRef.current.clientWidth
        const height = mountRef.current.clientHeight
        
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
        
        if (rendererRef.current) {
          rendererRef.current.dispose()
        }
        
        if (mountRef.current && rendererRef.current?.domElement) {
          mountRef.current.removeChild(rendererRef.current.domElement)
        }
      }
    }, [mounted])

    useEffect(() => {
      executeUserCode(code)
    }, [code])

    return (
      <div
        ref={mountRef}
        className={cn(
          "w-full h-full bg-gradient-to-br from-gray-900 to-black rounded-lg overflow-hidden border border-gray-800",
          className
        )}
        style={{ minHeight: '400px' }}
      />
    )
  }
)

ThreeJSCanvas.displayName = 'ThreeJSCanvas'

export default ThreeJSCanvas
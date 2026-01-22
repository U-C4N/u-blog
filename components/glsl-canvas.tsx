'use client'

import { useRef, useEffect, useLayoutEffect, forwardRef, useImperativeHandle, useState, useCallback } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

interface GLSLCanvasProps {
  fragmentShader: string
  className?: string
}

export interface GLSLCanvasRef {
  reset: () => void
  getCanvas: () => HTMLCanvasElement | null
}

const GLSLCanvas = forwardRef<GLSLCanvasRef, GLSLCanvasProps>(
  ({ fragmentShader, className = '' }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const glRef = useRef<WebGLRenderingContext | null>(null)
    const programRef = useRef<WebGLProgram | null>(null)
    const animationRef = useRef<number | undefined>(undefined)
    const startTime = useRef<number>(Date.now())
    const [error, setError] = useState<string | null>(null)

    useImperativeHandle(ref, () => ({
      reset: () => {
        startTime.current = Date.now()
      },
      getCanvas: () => canvasRef.current
    }))

    const vertexShaderSource = `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `

    const createShaderProgram = useCallback((gl: WebGLRenderingContext, fragmentSource: string): WebGLProgram | null => {
      console.log('Creating shader program...')
      
      // Create and compile vertex shader
      const vertexShader = gl.createShader(gl.VERTEX_SHADER)
      if (!vertexShader) {
        console.error('Failed to create vertex shader')
        setError('Failed to create vertex shader')
        return null
      }

      gl.shaderSource(vertexShader, vertexShaderSource)
      gl.compileShader(vertexShader)

      if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(vertexShader)
        console.error('Vertex shader compilation error:', error)
        gl.deleteShader(vertexShader)
        setError(`Vertex shader error: ${error}`)
        return null
      }

      // Convert Shadertoy-style shader to standard WebGL
      const standardFragmentSource = `
        precision mediump float;
        uniform vec2 iResolution;
        uniform float iTime;
        uniform vec2 iMouse;
        
        ${fragmentSource}
        
        void main() {
          mainImage(gl_FragColor, gl_FragCoord.xy);
        }
      `

      // Create and compile fragment shader
      const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)
      if (!fragmentShader) {
        console.error('Failed to create fragment shader')
        gl.deleteShader(vertexShader)
        setError('Failed to create fragment shader')
        return null
      }

      gl.shaderSource(fragmentShader, standardFragmentSource)
      gl.compileShader(fragmentShader)

      if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        const errorLog = gl.getShaderInfoLog(fragmentShader)
        console.error('Fragment shader compilation error:', errorLog)
        gl.deleteShader(vertexShader)
        gl.deleteShader(fragmentShader)
        setError(errorLog || 'Fragment shader compilation failed')
        return null
      }

      // Create and link program
      const program = gl.createProgram()
      if (!program) {
        console.error('Failed to create program')
        gl.deleteShader(vertexShader)
        gl.deleteShader(fragmentShader)
        setError('Failed to create shader program')
        return null
      }

      gl.attachShader(program, vertexShader)
      gl.attachShader(program, fragmentShader)
      gl.linkProgram(program)

      // Clean up shaders (they're now part of the program)
      gl.deleteShader(vertexShader)
      gl.deleteShader(fragmentShader)

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const error = gl.getProgramInfoLog(program)
        console.error('Program linking error:', error)
        gl.deleteProgram(program)
        setError(`Program linking error: ${error}`)
        return null
      }

      console.log('Shader program created successfully')
      return program
    }, [vertexShaderSource])

    const setupCanvas = useCallback(() => {
      const canvas = canvasRef.current
      if (!canvas) {
        console.log('Canvas not available')
        return
      }

      // Ensure canvas has proper size
      const container = canvas.parentElement
      if (container) {
        const rect = container.getBoundingClientRect()
        const width = Math.max(rect.width, 300)
        const height = Math.max(rect.height, 300)
        
        canvas.width = width
        canvas.height = height
        canvas.style.width = width + 'px'
        canvas.style.height = height + 'px'
        
        console.log(`Canvas setup: ${width}x${height}`)
      }

      const gl = canvas.getContext('webgl', { 
        antialias: true,
        alpha: false,
        premultipliedAlpha: false
      })
      
      if (!gl) {
        setError('WebGL not supported by this browser')
        console.error('WebGL context creation failed')
        return
      }

      glRef.current = gl
      gl.viewport(0, 0, canvas.width, canvas.height)

      // Create quad vertices
      const vertices = new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
         1,  1
      ])

      const buffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)
      
      console.log('Canvas setup completed successfully')
    }, [])

    const render = useCallback(() => {
      const canvas = canvasRef.current
      const gl = glRef.current
      const program = programRef.current

      if (!canvas || !gl || !program) {
        console.log('Render aborted: missing components', { 
          canvas: !!canvas, 
          gl: !!gl, 
          program: !!program 
        })
        return
      }

      // Skip rendering if canvas has zero size
      if (canvas.width === 0 || canvas.height === 0) {
        console.log('Render aborted: zero canvas size', { 
          width: canvas.width, 
          height: canvas.height 
        })
        // Schedule next frame anyway
        animationRef.current = requestAnimationFrame(render)
        return
      }

      try {
        // Update canvas size if needed
        const displayWidth = canvas.clientWidth
        const displayHeight = canvas.clientHeight

        if (displayWidth > 0 && displayHeight > 0) {
          if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
            canvas.width = displayWidth
            canvas.height = displayHeight
            gl.viewport(0, 0, displayWidth, displayHeight)
            console.log(`Canvas resized in render: ${displayWidth}x${displayHeight}`)
          }
        }

        gl.useProgram(program)

        const positionLocation = gl.getAttribLocation(program, 'a_position')
        if (positionLocation === -1) {
          console.error('Could not find a_position attribute')
          return
        }

        gl.enableVertexAttribArray(positionLocation)
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

        // Set uniforms
        const resolutionLocation = gl.getUniformLocation(program, 'iResolution')
        const timeLocation = gl.getUniformLocation(program, 'iTime')
        const mouseLocation = gl.getUniformLocation(program, 'iMouse')

        if (resolutionLocation) {
          gl.uniform2f(resolutionLocation, canvas.width, canvas.height)
        }
        if (timeLocation) {
          gl.uniform1f(timeLocation, (Date.now() - startTime.current) / 1000)
        }
        if (mouseLocation) {
          gl.uniform2f(mouseLocation, 0, 0)
        }

        // Clear and draw
        gl.clearColor(0, 0, 0, 1)
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

        // Check for GL errors
        const error = gl.getError()
        if (error !== gl.NO_ERROR) {
          console.error('WebGL error during render:', error)
        }

      } catch (error) {
        console.error('Render error:', error)
      }

      // Schedule next frame
      animationRef.current = requestAnimationFrame(render)
    }, [])

    // Setup canvas after component mounts
    useLayoutEffect(() => {
      const timer = setTimeout(() => {
        setupCanvas()
      }, 100) // Small delay to ensure DOM is ready
      
      return () => {
        clearTimeout(timer)
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current)
        }
      }
    }, [setupCanvas])

    // Setup ResizeObserver for canvas resizing
    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect
          if (width > 0 && height > 0) {
            canvas.width = width
            canvas.height = height
            const gl = glRef.current
            if (gl) {
              gl.viewport(0, 0, width, height)
              console.log(`Canvas resized: ${width}x${height}`)
            }
          }
        }
      })

      const container = canvas.parentElement
      if (container) {
        resizeObserver.observe(container)
      }

      return () => {
        resizeObserver.disconnect()
      }
    }, [])

    // Handle shader changes and program compilation
    useEffect(() => {
      const gl = glRef.current
      if (!gl || !fragmentShader.trim()) return

      console.log('Compiling new shader...')
      setError(null)
      
      // Clean up old program
      if (programRef.current) {
        gl.deleteProgram(programRef.current)
        programRef.current = null
      }

      // Cancel current animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = undefined
      }

      // Create new program
      const program = createShaderProgram(gl, fragmentShader)
      if (program) {
        programRef.current = program
        console.log('Starting render loop...')
        render()
      } else {
        console.error('Failed to create shader program')
      }
    }, [fragmentShader, createShaderProgram, render])

    const isValidShader = (shader: string): boolean => {
      return shader.trim().length > 0 && shader.includes('mainImage')
    }

    if (!isValidShader(fragmentShader)) {
      return (
        <div className={`bg-muted/50 rounded-lg flex items-center justify-center min-h-[300px] ${className}`}>
          <Alert className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Shader code is invalid. Please provide a GLSL fragment shader that includes <code>mainImage(out vec4 fragColor, in vec2 fragCoord)</code>.
            </AlertDescription>
          </Alert>
        </div>
      )
    }

    if (error) {
      return (
        <div className={`bg-red-950/20 rounded-lg flex items-center justify-center min-h-[300px] ${className}`}>
          <Alert variant="destructive" className="max-w-lg">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <strong>Shader Compilation Error:</strong>
                <pre className="text-xs bg-red-900/20 p-2 rounded overflow-auto max-h-32">
                  {error}
                </pre>
                <p className="text-xs text-red-300">
                  Check the browser console (F12) for more detailed information.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )
    }

    return (
      <div className={`relative bg-black rounded-lg overflow-hidden ${className}`}>
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
        />
      </div>
    )
  }
)

GLSLCanvas.displayName = 'GLSLCanvas'

export default GLSLCanvas

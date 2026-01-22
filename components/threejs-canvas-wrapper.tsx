'use client'

import { forwardRef } from 'react'
import dynamic from 'next/dynamic'

export interface ThreeJSCanvasRef {
  reset: () => void
  updateCode: (code: string) => void
}

interface ThreeJSCanvasProps {
  code: string
  className?: string
  onError?: (error: string | null) => void
}

const ThreeJSCanvas = dynamic(() => import('./threejs-canvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black rounded-lg border border-gray-800">
      <div className="text-center text-gray-400">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
        <p>Loading Three.js...</p>
      </div>
    </div>
  ),
})

const ThreeJSCanvasWrapper = forwardRef<ThreeJSCanvasRef, ThreeJSCanvasProps>(
  (props, ref) => {
    return <ThreeJSCanvas ref={ref} {...props} />
  }
)

ThreeJSCanvasWrapper.displayName = 'ThreeJSCanvasWrapper'

export default ThreeJSCanvasWrapper
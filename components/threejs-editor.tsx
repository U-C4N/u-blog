'use client'

import { useRef, useEffect } from 'react'
import { Editor } from '@monaco-editor/react'
import { cn } from '@/lib/utils'

interface ThreeJSEditorProps {
  value: string
  onChange: (value: string) => void
  error?: string | null
  className?: string
}

const defaultCode = `// Create a rotating cube
const geometry = new THREE.BoxGeometry()
const material = new THREE.MeshLambertMaterial({ color: 0x00ff00 })
const cube = createMesh(geometry, material)

// Animation loop
const animate = () => {
  const time = clock.getElapsedTime()
  cube.rotation.x = time
  cube.rotation.y = time * 0.5
}

animate()`

export default function ThreeJSEditor({ 
  value, 
  onChange, 
  error, 
  className 
}: ThreeJSEditorProps) {
  const editorRef = useRef(null)

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor

    // Add Three.js type definitions and autocompletion
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: 'React',
      allowJs: true,
      typeRoots: ['node_modules/@types']
    })

    // Add Three.js global definitions
    monaco.languages.typescript.javascriptDefaults.addExtraLib(`
      declare const THREE: typeof import('three')
      declare const scene: import('three').Scene
      declare const camera: import('three').PerspectiveCamera
      declare const renderer: import('three').WebGLRenderer
      declare const clock: import('three').Clock
      declare function createMesh(geometry: import('three').BufferGeometry, material: import('three').Material): import('three').Mesh
      declare function createLight(light: import('three').Light): import('three').Light
    `, 'ts:three-globals.d.ts')

    // Set editor theme
    monaco.editor.defineTheme('three-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955' },
        { token: 'keyword', foreground: '569CD6' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
      ],
      colors: {
        'editor.background': '#0f0f0f',
        'editor.foreground': '#D4D4D4',
        'editorLineNumber.foreground': '#858585',
        'editor.selectionBackground': '#264F78',
        'editor.inactiveSelectionBackground': '#3A3D41',
      }
    })

    monaco.editor.setTheme('three-dark')
  }

  return (
    <div className={cn("relative h-full", className)}>
      <div className="absolute inset-0 flex flex-col">
        <div className="flex-1 border-r border-border">
          <Editor
            height="100%"
            defaultLanguage="javascript"
            value={value || defaultCode}
            onChange={(val) => onChange(val || '')}
            onMount={handleEditorDidMount}
            loading={
              <div className="flex items-center justify-center h-full">
                <div className="text-sm text-muted-foreground animate-pulse">Loading editor...</div>
              </div>
            }
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              insertSpaces: true,
              wordWrap: 'on',
              lineNumbers: 'on',
              glyphMargin: false,
              folding: true,
              lineDecorationsWidth: 0,
              lineNumbersMinChars: 3,
              renderLineHighlight: 'line',
              selectOnLineNumbers: true,
              roundedSelection: false,
              readOnly: false,
              cursorStyle: 'line',
            }}
          />
        </div>
        
        {error && (
          <div className="bg-red-900/20 border-t border-red-500/20 p-3" aria-live="assertive">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
              <div className="text-sm text-red-200">
                <div className="font-medium mb-1">Compilation Error</div>
                <div className="text-red-300 font-mono text-xs whitespace-pre-wrap">
                  {error}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
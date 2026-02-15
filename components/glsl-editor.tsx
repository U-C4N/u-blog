'use client'

import { useState, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FileText, Download, AlertCircle } from 'lucide-react'
import { useTheme } from 'next-themes'
import { downloadTextFile } from '@/lib/file-utils'

interface GLSLEditorProps {
  value: string
  onChange: (value: string) => void
  error?: string | null
  className?: string
}

interface ShaderError {
  line: number
  message: string
}

const parseShaderError = (error: string): ShaderError | null => {
  // Parse WebGL shader compilation errors
  const lineMatch = error.match(/ERROR: \d+:(\d+):/);
  if (lineMatch) {
    return {
      line: parseInt(lineMatch[1]),
      message: error.split(':').slice(2).join(':').trim()
    }
  }
  return null
}

export default function GLSLEditor({ value, onChange, error, className = '' }: GLSLEditorProps) {
  const [editorInstance, setEditorInstance] = useState<any>(null)
  const { theme } = useTheme()

  const handleEditorDidMount = useCallback((editor: any, monaco: any) => {
    setEditorInstance(editor)
    
    // Configure GLSL language support
    monaco.languages.register({ id: 'glsl' })
    
    // Define GLSL syntax highlighting
    monaco.languages.setMonarchTokensProvider('glsl', {
      tokenizer: {
        root: [
          [/\b(uniform|attribute|varying|precision|highp|mediump|lowp)\b/, 'keyword'],
          [/\b(void|float|vec2|vec3|vec4|mat2|mat3|mat4|int|bool|sampler2D)\b/, 'type'],
          [/\b(main|mainImage|gl_FragColor|gl_FragCoord|gl_Position)\b/, 'predefined'],
          [/\b(sin|cos|tan|length|distance|dot|cross|normalize|reflect|texture2D|mix|step|smoothstep|clamp|min|max|abs|floor|ceil|fract|mod|pow|exp|log|sqrt)\b/, 'function'],
          [/#\w+/, 'preprocessor'],
          [/\/\/.*$/, 'comment'],
          [/\/\*[\s\S]*?\*\//, 'comment'],
          [/\d*\.\d+([eE][-+]?\d+)?[fF]?/, 'number.float'],
          [/\d+[fF]/, 'number.float'],
          [/\d+/, 'number']
        ]
      }
    })
    
    // Set editor options
    editor.updateOptions({
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 14,
      lineNumbers: 'on',
      glyphMargin: false,
      folding: true,
      lineDecorationsWidth: 20,
      lineNumbersMinChars: 3
    })
  }, [])

  const handleExportShader = () => {
    downloadTextFile(value, 'shader.glsl', 'text/plain')
  }

  const parsedError = error ? parseShaderError(error) : null

  return (
    <Card className={`h-full ${className}`}>
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          <span className="font-medium">GLSL Editor</span>
          <Badge variant="secondary" className="text-xs">Fragment Shader</Badge>
        </div>
        <Button 
          onClick={handleExportShader}
          size="sm" 
          variant="outline"
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>
      
      <CardContent className="p-0 flex flex-col h-full">
        {error && (
          <Alert variant="destructive" className="m-4 mb-0" aria-live="assertive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {parsedError ? (
                <>
                  <strong>Line {parsedError.line}:</strong> {parsedError.message}
                </>
              ) : (
                error
              )}
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex-1 min-h-0">
          <Editor
            height="100%"
            language="glsl"
            theme={theme === 'dark' ? 'vs-dark' : 'light'}
            value={value}
            onChange={(val) => onChange(val || '')}
            onMount={handleEditorDidMount}
            loading={
              <div className="flex items-center justify-center h-full">
                <div className="text-sm text-muted-foreground animate-pulse">Loading editor...</div>
              </div>
            }
            options={{
              wordWrap: 'on',
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 14,
              tabSize: 2,
              insertSpaces: true,
              automaticLayout: true
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RotateCcw, Play, Pause, Settings } from 'lucide-react'

interface UniformControlsProps {
  isPlaying: boolean
  onPlayPause: () => void
  onReset: () => void
  className?: string
}

interface UniformValue {
  name: string
  value: number
  min: number
  max: number
  step: number
  description: string
}

const defaultUniforms: UniformValue[] = [
  {
    name: 'Speed',
    value: 1.0,
    min: 0.0,
    max: 5.0,
    step: 0.1,
    description: 'Animation speed multiplier'
  },
  {
    name: 'Scale',
    value: 1.0,
    min: 0.1,
    max: 3.0,
    step: 0.1,
    description: 'Pattern scale factor'
  },
  {
    name: 'Intensity',
    value: 1.0,
    min: 0.0,
    max: 2.0,
    step: 0.05,
    description: 'Color intensity'
  }
]

export default function UniformControls({ 
  isPlaying, 
  onPlayPause, 
  onReset, 
  className = '' 
}: UniformControlsProps) {
  const [uniforms, setUniforms] = useState<UniformValue[]>(defaultUniforms)
  const [showControls, setShowControls] = useState(false)

  const handleUniformChange = (index: number, value: number[]) => {
    const newUniforms = [...uniforms]
    newUniforms[index] = { ...newUniforms[index], value: value[0] }
    setUniforms(newUniforms)
  }

  const resetUniforms = () => {
    setUniforms(defaultUniforms.map(uniform => ({ ...uniform })))
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Controls
          </div>
          <Badge variant="outline" className="text-xs">
            Real-time
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Playback Controls */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Playback</Label>
          <div className="flex gap-2">
            <Button 
              onClick={onPlayPause}
              size="sm"
              variant={isPlaying ? "default" : "outline"}
              className="flex items-center gap-2"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Play
                </>
              )}
            </Button>
            
            <Button 
              onClick={onReset}
              size="sm"
              variant="outline"
              className="flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>
          </div>
        </div>

        {/* Uniform Controls Toggle */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Parameters</Label>
            <Button
              onClick={() => setShowControls(!showControls)}
              size="sm"
              variant="ghost"
              className="text-xs"
            >
              {showControls ? 'Hide' : 'Show'}
            </Button>
          </div>
          
          {showControls && (
            <div className="space-y-4 pt-2 border-t">
              {uniforms.map((uniform, index) => (
                <div key={uniform.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">{uniform.name}</Label>
                    <Badge variant="secondary" className="text-xs">
                      {uniform.value.toFixed(2)}
                    </Badge>
                  </div>
                  <Slider
                    value={[uniform.value]}
                    onValueChange={(value) => handleUniformChange(index, value)}
                    min={uniform.min}
                    max={uniform.max}
                    step={uniform.step}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    {uniform.description}
                  </p>
                </div>
              ))}
              
              <Button
                onClick={resetUniforms}
                size="sm"
                variant="outline"
                className="w-full mt-4"
              >
                Reset Parameters
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
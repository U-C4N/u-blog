'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Play, Pause, RotateCcw, Eye, FileText, Download } from 'lucide-react'
import CopyButton from '@/components/copy-button'

const defaultShader = `#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;

void main() {
    vec2 st = gl_FragCoord.xy/u_resolution.xy;
    
    // Time varying pixel color
    vec3 col = 0.5 + 0.5*cos(u_time + st.xyx + vec3(0,2,4));
    
    // Mouse interaction
    vec2 mouse = u_mouse/u_resolution;
    float d = distance(st, mouse);
    col += 0.3 * exp(-d*10.0);
    
    gl_FragColor = vec4(col, 1.0);
}`

export default function GLSLPreviewer() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <Eye className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold mb-2">GLSL Previewer Geçici Olarak Kullanılamıyor</h3>
          <p className="text-muted-foreground mb-4">
            WebGL destekli GLSL shader previewer şu anda geliştirme aşamasındadır.
          </p>
          <div className="text-sm text-muted-foreground">
            <p>💡 Yakında:</p>
            <ul className="mt-2 space-y-1">
              <li>• Gerçek zamanlı shader rendering</li>
              <li>• Fragment shader desteği</li>
              <li>• Hazır şablonlar</li>
              <li>• Mouse ve zaman etkileşimleri</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

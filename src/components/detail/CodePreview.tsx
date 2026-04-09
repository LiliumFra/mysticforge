'use client'
import { useState } from 'react'
import { Copy, Check, FileCode } from 'lucide-react'

interface CodePreviewProps {
  content: string
  type: string
}

export function CodePreview({ content, type }: CodePreviewProps) {
  const [copied, setCopied] = useState(false)
  const [showFull, setShowFull] = useState(false)

  const lines = content.split('\n')
  const preview = showFull ? content : lines.slice(0, 40).join('\n')
  const hasMore = lines.length > 40

  async function copy() {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.05)]">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-[#8B5CF6]" />
          <span className="text-xs font-medium text-[#9BABC8]">
            {type === 'cursor_rule' ? 'rule.mdc' : 'SKILL.md'}
          </span>
          <span className="text-xs text-[#3D4A6B]">· {lines.length} líneas</span>
        </div>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 text-xs text-[#5A6B8C] hover:text-[#00FFC2] transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-[#00FFC2]" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <div className="overflow-x-auto">
        <pre className="p-4 text-xs font-mono text-[#9BABC8] leading-relaxed" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          <code>{preview}</code>
        </pre>
      </div>
      {hasMore && !showFull && (
        <div className="px-4 py-3 border-t border-[rgba(255,255,255,0.05)] text-center">
          <button
            onClick={() => setShowFull(true)}
            className="text-xs text-[#00FFC2] hover:underline"
          >
            Mostrar {lines.length - 40} líneas más...
          </button>
        </div>
      )}
    </div>
  )
}

'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Download, Loader2, Check, Copy } from 'lucide-react'

type Target = 'claude' | 'cursor' | 'gemini' | 'raw'

const TARGETS: Array<{ id: Target; label: string; emoji: string; desc: string; color: string }> = [
  { id: 'claude', label: 'Claude Code', emoji: '🟠', desc: '.claude/skills/', color: '#EF5777' },
  { id: 'cursor', label: 'Cursor IDE', emoji: '📝', desc: '.cursor/rules/', color: '#8B5CF6' },
  { id: 'gemini', label: 'Gemini CLI', emoji: '🔵', desc: '.gemini/skills/', color: '#4F9EFF' },
  { id: 'raw', label: 'Raw / Universal', emoji: '📦', desc: 'Compatible .agents/skills/', color: '#00FFC2' },
]

interface DownloadPanelProps {
  resource: {
    id: string
    slug: string
    display_name: string
    content: string
  }
}

export function DownloadPanel({ resource }: DownloadPanelProps) {
  const [downloading, setDownloading] = useState<Target | null>(null)
  const [copied, setCopied] = useState(false)
  const [done, setDone] = useState<Target | null>(null)

  async function handleDownload(target: Target) {
    setDownloading(target)
    try {
      const res = await fetch(`/api/download/${resource.id}?target=${target}`)
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${resource.slug}-${target}.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setDone(target)
      setTimeout(() => setDone(null), 3000)
    } catch (err) {
      console.error(err)
    }
    setDownloading(null)
  }

  async function copyContent() {
    await navigator.clipboard.writeText(resource.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function downloadRaw() {
    const blob = new Blob([resource.content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${resource.slug}.md`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="glass-card rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-[#F0F4FF] flex items-center gap-2">
        <Download className="w-4 h-4 text-[#00FFC2]" />
        Descargar ZIP
      </h3>

      <div className="space-y-2">
        {TARGETS.map(target => (
          <button
            key={target.id}
            onClick={() => handleDownload(target.id)}
            disabled={downloading !== null}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all group"
            style={{
              borderColor: `${target.color}20`,
              background: `${target.color}08`,
            }}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-lg">{target.emoji}</span>
              <div className="text-left">
                <div className="text-sm font-medium text-[#F0F4FF] group-hover:text-white">{target.label}</div>
                <div className="text-xs text-[#5A6B8C] font-mono">{target.desc}</div>
              </div>
            </div>
            {downloading === target.id ? (
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: target.color }} />
            ) : done === target.id ? (
              <Check className="w-4 h-4 text-[#00FFC2]" />
            ) : (
              <Download className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: target.color }} />
            )}
          </button>
        ))}
      </div>

      <div className="pt-2 border-t border-[rgba(255,255,255,0.05)] flex gap-2">
        <button
          onClick={copyContent}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] text-[#9BABC8] hover:text-[#F0F4FF] hover:border-[rgba(255,255,255,0.12)] transition-all"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-[#00FFC2]" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? '¡Copiado!' : 'Copiar'}
        </button>
        <button
          onClick={downloadRaw}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] text-[#9BABC8] hover:text-[#F0F4FF] hover:border-[rgba(255,255,255,0.12)] transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          Raw .md
        </button>
      </div>
    </div>
  )
}

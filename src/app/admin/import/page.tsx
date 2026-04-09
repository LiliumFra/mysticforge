'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, RefreshCw, Check, X, AlertTriangle, Clock, ChevronDown, ChevronRight } from 'lucide-react'

interface ImportSource {
  id: string
  name: string
  owner: string
  repo: string
  branch: string
  is_active: boolean
  last_synced_at: string | null
  total_imported: number
}

interface ImportLog {
  id: string
  status: string
  started_at: string
  completed_at: string | null
  files_scanned: number
  files_new: number
  files_updated: number
  files_skipped: number
  files_quarantined: number
  files_failed: number
  error_message: string | null
}

export default function ImportPage() {
  const [sources, setSources] = useState<ImportSource[]>([])
  const [logs, setLogs] = useState<ImportLog[]>([])
  const [importing, setImporting] = useState(false)
  const [selectedSource, setSelectedSource] = useState<string | null>(null)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  async function fetchData() {
    const res = await fetch('/api/import')
    if (res.ok) {
      const data = await res.json()
      setSources(data.sources || [])
      setLogs(data.logs || [])
    }
  }

  useEffect(() => { fetchData() }, [])

  async function runImport(sourceId?: string) {
    setImporting(true)
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_id: sourceId }),
      })
      if (res.ok) {
        await fetchData()
      }
    } catch {}
    setImporting(false)
  }

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'completed') return <Check className="w-4 h-4 text-[#00FFC2]" />
    if (status === 'failed') return <X className="w-4 h-4 text-[#EF5777]" />
    if (status === 'running') return <RefreshCw className="w-4 h-4 text-[#DFFF00] animate-spin" />
    return <Clock className="w-4 h-4 text-[#5A6B8C]" />
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-[#F0F4FF]">Auto-Import System</h2>
        <button
          onClick={() => runImport()}
          disabled={importing}
          className="flex items-center gap-2 btn-cyber px-4 py-2 rounded-xl text-sm"
        >
          {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {importing ? 'Importando...' : 'Importar Todo'}
        </button>
      </div>

      {/* Import sources */}
      <div className="glass-card rounded-xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-[#F0F4FF] mb-4">Fuentes Configuradas</h3>
        {sources.length === 0 ? (
          <p className="text-[#5A6B8C] text-sm">No hay fuentes configuradas. Agrega tu GITHUB_TOKEN al .env.local para habilitar el auto-import.</p>
        ) : (
          <div className="space-y-3">
            {sources.map(source => (
              <div key={source.id} className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                <div className={`w-2 h-2 rounded-full ${source.is_active ? 'bg-[#00FFC2]' : 'bg-[#3D4A6B]'}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-[#F0F4FF]">{source.name}</div>
                  <div className="text-xs text-[#5A6B8C] font-mono">{source.owner}/{source.repo}@{source.branch}</div>
                  <div className="text-xs text-[#3D4A6B]">
                    {source.total_imported} importados · {source.last_synced_at ? `Sync: ${new Date(source.last_synced_at).toLocaleDateString('es')}` : 'Nunca sincronizado'}
                  </div>
                </div>
                <button
                  onClick={() => runImport(source.id)}
                  disabled={importing}
                  className="text-xs btn-cyber px-3 py-1.5 rounded-lg"
                >
                  Sync
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Import logs */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#F0F4FF]">Historial de Imports</h3>
          <button onClick={fetchData} className="text-xs text-[#9BABC8] hover:text-[#00FFC2] flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Actualizar
          </button>
        </div>
        {logs.length === 0 ? (
          <p className="text-[#5A6B8C] text-sm">No hay logs aún. Ejecuta tu primer import.</p>
        ) : (
          <div className="space-y-2">
            {logs.map(log => (
              <div key={log.id} className="rounded-xl border border-[rgba(255,255,255,0.05)] overflow-hidden">
                <button
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                >
                  <StatusIcon status={log.status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs font-medium text-[#F0F4FF]">{log.status.toUpperCase()}</span>
                      <span className="text-xs text-[#5A6B8C]">{new Date(log.started_at).toLocaleString('es')}</span>
                    </div>
                    <div className="flex gap-3 text-xs text-[#9BABC8] mt-0.5">
                      <span className="text-[#00FFC2]">+{log.files_new} new</span>
                      <span>~{log.files_updated} updated</span>
                      <span className="text-[#5A6B8C]">{log.files_skipped} skipped</span>
                      {log.files_quarantined > 0 && <span className="text-[#EF5777]">⚠️ {log.files_quarantined} quarantined</span>}
                    </div>
                  </div>
                  {expandedLog === log.id ? <ChevronDown className="w-4 h-4 text-[#5A6B8C]" /> : <ChevronRight className="w-4 h-4 text-[#5A6B8C]" />}
                </button>
                <AnimatePresence>
                  {expandedLog === log.id && log.error_message && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="border-t border-[rgba(255,255,255,0.05)] px-4 py-3 bg-[rgba(239,87,119,0.05)]"
                    >
                      <p className="text-xs text-[#EF5777] font-mono">{log.error_message}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

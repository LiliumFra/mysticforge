'use client'
import { Shield, AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react'
import { useState } from 'react'

type Severity = 'clean' | 'low' | 'medium' | 'high' | 'critical'

interface Finding {
  category: string
  severity: string
  message: string
  line?: number
}

interface SecurityBadgeProps {
  score: number
  severity: Severity
  findings: Finding[]
}

const SEVERITY_CONFIG: Record<Severity, { label: string; icon: React.ReactNode; textClass: string; bgClass: string; borderClass: string }> = {
  clean: {
    label: 'Limpio',
    icon: <CheckCircle className="w-4 h-4" />,
    textClass: 'text-[#00FFC2]',
    bgClass: 'bg-[rgba(0,255,194,0.1)]',
    borderClass: 'border-[rgba(0,255,194,0.3)]',
  },
  low: {
    label: 'Riesgo Bajo',
    icon: <Info className="w-4 h-4" />,
    textClass: 'text-[#60A5FA]',
    bgClass: 'bg-[rgba(96,165,250,0.1)]',
    borderClass: 'border-[rgba(96,165,250,0.3)]',
  },
  medium: {
    label: 'Riesgo Medio',
    icon: <AlertTriangle className="w-4 h-4" />,
    textClass: 'text-[#DFFF00]',
    bgClass: 'bg-[rgba(223,255,0,0.08)]',
    borderClass: 'border-[rgba(223,255,0,0.3)]',
  },
  high: {
    label: 'Riesgo Alto',
    icon: <AlertTriangle className="w-4 h-4" />,
    textClass: 'text-[#FB923C]',
    bgClass: 'bg-[rgba(251,146,60,0.1)]',
    borderClass: 'border-[rgba(251,146,60,0.3)]',
  },
  critical: {
    label: 'CRÍTICO',
    icon: <XCircle className="w-4 h-4" />,
    textClass: 'text-[#EF5777]',
    bgClass: 'bg-[rgba(239,87,119,0.1)]',
    borderClass: 'border-[rgba(239,87,119,0.3)]',
  },
}

export function SecurityBadge({ score, severity, findings }: SecurityBadgeProps) {
  const [expanded, setExpanded] = useState(false)
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.clean

  return (
    <div className="flex flex-col items-end gap-2 min-w-[120px]">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl border transition-all ${config.bgClass} ${config.borderClass} hover:opacity-80`}
      >
        <div className={`flex items-center gap-1.5 ${config.textClass}`}>
          <Shield className="w-4 h-4" />
          <span className="text-lg font-black">{score}</span>
        </div>
        <div className={`flex items-center gap-1 ${config.textClass} text-xs font-semibold`}>
          {config.icon}
          {config.label}
        </div>
      </button>

      {expanded && findings.length > 0 && (
        <div className="w-64 glass rounded-xl p-3 border border-[rgba(255,255,255,0.06)] space-y-2 text-xs">
          <p className="font-semibold text-[#F0F4FF] text-xs mb-2">OWASP AST10 Findings:</p>
          {findings.slice(0, 5).map((f, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className={`font-medium mt-0.5 ${
                f.severity === 'critical' ? 'text-[#EF5777]' :
                f.severity === 'high' ? 'text-[#FB923C]' :
                f.severity === 'medium' ? 'text-[#DFFF00]' : 'text-[#60A5FA]'
              }`}>
                {f.severity.toUpperCase()}
              </span>
              <div>
                <div className="text-[#5A6B8C]">{f.category}</div>
                {f.line && <div className="text-[#3D4A6B]">Línea {f.line}</div>}
              </div>
            </div>
          ))}
          {findings.length > 5 && (
            <p className="text-[#3D4A6B]">+{findings.length - 5} hallazgos más</p>
          )}
        </div>
      )}
    </div>
  )
}

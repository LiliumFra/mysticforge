'use client'
import { useState } from 'react'
import { Copy, Check, Terminal } from 'lucide-react'

interface CLICommandsProps {
  resource: {
    slug: string
    cli_source?: string
    cli_package?: string
    source_repo?: string
  }
}

export function CLICommands({ resource }: CLICommandsProps) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

  async function copy(text: string, idx: number) {
    await navigator.clipboard.writeText(text)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  const commands: Array<{ label: string; command: string; desc: string }> = []

  // agentskill.sh CLI
  if (resource.cli_source === 'agentskill.sh' && resource.cli_package) {
    commands.push({
      label: 'agentskill.sh',
      command: `npx @agentskill.sh/cli add ${resource.cli_package}`,
      desc: 'Instalar vía registro agentskill.sh',
    })
  }

  // GitHub source
  if (resource.source_repo) {
    commands.push({
      label: 'npx skills',
      command: `npx skills add ${resource.source_repo} --path .claude/skills/`,
      desc: 'Instalar desde GitHub con skills CLI',
    })
    commands.push({
      label: 'GitHub CLI',
      command: `gh repo clone ${resource.source_repo} && cp -r ${resource.source_repo.split('/')[1]} .claude/skills/`,
      desc: 'Clonar repo y copiar skill manualmente',
    })
  }

  // MysticForge API (native)
  commands.push({
    label: 'MysticForge API',
    command: `curl -L "https://mysticforge.ai/api/download/${resource.slug}?target=claude" -o ${resource.slug}-claude.zip && unzip ${resource.slug}-claude.zip`,
    desc: 'Descargar y descomprimir vía CLI',
  })

  if (commands.length === 0) return null

  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Terminal className="w-4 h-4 text-[#00FFC2]" />
        <h3 className="text-sm font-semibold text-[#F0F4FF]">Instalar por CLI</h3>
      </div>
      <div className="space-y-3">
        {commands.map((cmd, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#5A6B8C] font-medium">{cmd.label}</span>
              <span className="text-xs text-[#3D4A6B]">{cmd.desc}</span>
            </div>
            <div className="flex items-center gap-2 bg-[#0D0F14] rounded-lg px-3 py-2.5 border border-[rgba(255,255,255,0.05)] group">
              <span className="text-[#00FFC2] text-xs font-mono flex-1 overflow-auto whitespace-nowrap scrollbar-hide">
                {cmd.command}
              </span>
              <button
                onClick={() => copy(cmd.command, i)}
                className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0"
              >
                {copiedIdx === i ? (
                  <Check className="w-3.5 h-3.5 text-[#00FFC2]" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-[#5A6B8C] hover:text-[#00FFC2] transition-colors" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

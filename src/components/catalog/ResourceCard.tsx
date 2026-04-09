'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Shield, Download, Star, ExternalLink, ChevronRight } from 'lucide-react'

type SecuritySeverity = 'clean' | 'low' | 'medium' | 'high' | 'critical'
type ResourceType = 'skill' | 'mcp_prompt' | 'cursor_rule' | 'prompt'

interface ResourceCardProps {
  resource: {
    id: string
    slug: string
    name: string
    display_name: string
    description: string
    type: ResourceType
    category: string
    tags: string[]
    security_score: number
    security_severity: SecuritySeverity
    download_count: number
    is_featured: boolean
    source_repo?: string
  }
  index?: number
}

const TYPE_LABELS: Record<ResourceType, string> = {
  skill: 'Agent Skill',
  mcp_prompt: 'MCP Prompt',
  cursor_rule: 'Cursor Rule',
  prompt: 'Prompt',
}

const TYPE_COLORS: Record<ResourceType, string> = {
  skill: 'bg-[rgba(0,255,194,0.1)] text-[#00FFC2] border-[rgba(0,255,194,0.2)]',
  mcp_prompt: 'bg-[rgba(139,92,246,0.1)] text-[#8B5CF6] border-[rgba(139,92,246,0.2)]',
  cursor_rule: 'bg-[rgba(239,87,119,0.1)] text-[#EF5777] border-[rgba(239,87,119,0.2)]',
  prompt: 'bg-[rgba(223,255,0,0.1)] text-[#DFFF00] border-[rgba(223,255,0,0.2)]',
}

const SEVERITY_CONFIG: Record<SecuritySeverity, { label: string; class: string }> = {
  clean: { label: 'Clean', class: 'badge-clean' },
  low: { label: 'Low', class: 'badge-low' },
  medium: { label: 'Medium', class: 'badge-medium' },
  high: { label: 'High', class: 'badge-high' },
  critical: { label: 'Critical', class: 'badge-critical' },
}

export function ResourceCard({ resource, index = 0 }: ResourceCardProps) {
  const sec = SEVERITY_CONFIG[resource.security_severity] || SEVERITY_CONFIG.clean

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="glass-card rounded-2xl p-5 flex flex-col gap-3 h-full group"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${TYPE_COLORS[resource.type]}`}>
              {TYPE_LABELS[resource.type]}
            </span>
            {resource.is_featured && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[rgba(223,255,0,0.1)] text-[#DFFF00] border border-[rgba(223,255,0,0.2)]">
                <Star className="w-2.5 h-2.5 mr-1 fill-current" />
                Featured
              </span>
            )}
          </div>
          <h3 className="font-semibold text-[#F0F4FF] text-sm leading-tight line-clamp-1 group-hover:text-[#00FFC2] transition-colors">
            {resource.display_name}
          </h3>
        </div>

        {/* Security badge */}
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border whitespace-nowrap ${sec.class}`}>
          <Shield className="w-3 h-3" />
          {resource.security_score}
        </div>
      </div>

      {/* Description */}
      <p className="text-[#9BABC8] text-xs leading-relaxed line-clamp-2 flex-1">
        {resource.description}
      </p>

      {/* Tags */}
      {resource.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {resource.tags.slice(0, 3).map(tag => (
            <span key={tag} className="px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.04)] text-[#5A6B8C] text-xs border border-[rgba(255,255,255,0.05)]">
              {tag}
            </span>
          ))}
          {resource.tags.length > 3 && (
            <span className="px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.04)] text-[#5A6B8C] text-xs border border-[rgba(255,255,255,0.05)]">
              +{resource.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-[rgba(255,255,255,0.05)]">
        <div className="flex items-center gap-1 text-xs text-[#5A6B8C]">
          <Download className="w-3 h-3" />
          {resource.download_count.toLocaleString()}
        </div>
        {resource.source_repo && (
          <span className="text-xs text-[#3D4A6B] font-mono truncate max-w-[120px]">
            {resource.source_repo}
          </span>
        )}
        <Link
          href={`/catalog/${resource.slug}`}
          className="flex items-center gap-1 text-xs text-[#00FFC2] hover:text-white transition-colors font-medium"
        >
          Ver <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </motion.div>
  )
}

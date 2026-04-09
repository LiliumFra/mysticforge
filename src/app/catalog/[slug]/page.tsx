import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { DownloadPanel } from '@/components/detail/DownloadPanel'
import { SecurityBadge } from '@/components/detail/SecurityBadge'
import { CLICommands } from '@/components/detail/CLICommands'
import { CodePreview } from '@/components/detail/CodePreview'
import type { Metadata } from 'next'
import { ArrowLeft, Calendar, Tag, Cpu, ExternalLink } from 'lucide-react'
import Link from 'next/link'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('resources').select('display_name, description').eq('slug', slug).single()
  return {
    title: data?.display_name || slug,
    description: data?.description || '',
  }
}

export default async function ResourceDetailPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: resource } = await supabase
    .from('resources')
    .select('*')
    .or(`id.eq.${slug},slug.eq.${slug}`)
    .eq('is_published', true)
    .single()

  if (!resource) notFound()

  // Log view after response
  await supabase.rpc('increment_view', { resource_id_param: resource.id })

  const TYPE_LABELS: Record<string, string> = {
    skill: 'Agent Skill', mcp_prompt: 'MCP Prompt', cursor_rule: 'Cursor Rule', prompt: 'Prompt'
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
      {/* Back link */}
      <Link href="/catalog" className="inline-flex items-center gap-1.5 text-sm text-[#9BABC8] hover:text-[#00FFC2] transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Volver al catálogo
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header card */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-1">
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[rgba(0,255,194,0.1)] text-[#00FFC2] border border-[rgba(0,255,194,0.2)]">
                    {TYPE_LABELS[resource.type] || resource.type}
                  </span>
                  {resource.category && (
                    <span className="px-2.5 py-1 rounded-full text-xs bg-[rgba(255,255,255,0.05)] text-[#9BABC8] border border-[rgba(255,255,255,0.08)]">
                      {resource.category}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#F0F4FF] mb-2">{resource.display_name}</h1>
                <p className="text-[#9BABC8] leading-relaxed">{resource.description}</p>
              </div>
              <SecurityBadge
                score={resource.security_score}
                severity={resource.security_severity}
                findings={resource.security_findings || []}
              />
            </div>

            {/* Meta grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[rgba(255,255,255,0.05)]">
              <MetaItem icon={<Cpu className="w-3.5 h-3.5" />} label="Versión" value={resource.version || '1.0.0'} />
              <MetaItem icon={<Calendar className="w-3.5 h-3.5" />} label="Publicado" value={new Date(resource.created_at).toLocaleDateString('es')} />
              {resource.source_repo && (
                <MetaItem icon={<svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>} label="Fuente" value={resource.source_repo} />
              )}
              <MetaItem icon={<Tag className="w-3.5 h-3.5" />} label="Descargas" value={resource.download_count.toLocaleString()} />
            </div>
          </div>

          {/* Tags */}
          {resource.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {resource.tags.map((tag: string) => (
                <Link key={tag} href={`/catalog?q=${tag}`} className="px-3 py-1 rounded-full bg-[rgba(255,255,255,0.04)] text-[#5A6B8C] text-xs border border-[rgba(255,255,255,0.05)] hover:text-[#00FFC2] hover:border-[rgba(0,255,194,0.2)] transition-all">
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          {/* Code preview */}
          <CodePreview content={resource.content} type={resource.type} />

          {/* CLI Commands */}
          <CLICommands resource={resource} />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <DownloadPanel resource={resource} />

          {/* Compatible with */}
          {resource.compatible_with?.length > 0 && (
            <div className="glass-card rounded-xl p-4">
              <h3 className="text-sm font-semibold text-[#F0F4FF] mb-3">Compatible con</h3>
              <div className="flex flex-wrap gap-2">
                {resource.compatible_with.map((platform: string) => (
                  <span key={platform} className="px-2.5 py-1 rounded-lg text-xs bg-[rgba(255,255,255,0.05)] text-[#9BABC8] border border-[rgba(255,255,255,0.08)] capitalize">
                    {platform}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Source link */}
          {resource.source_url && (
            <a
              href={resource.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 glass-card rounded-xl hover:border-[rgba(0,255,194,0.2)] transition-all group"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[#9BABC8] fill-current" viewBox="0 0 24 24"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
                <span className="text-sm text-[#9BABC8] group-hover:text-[#00FFC2] transition-colors">Ver en GitHub</span>
              </div>
              <ArrowLeft className="w-4 h-4 rotate-180 text-[#5A6B8C] group-hover:text-[#00FFC2] transition-colors" />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function MetaItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1 text-xs text-[#5A6B8C]">{icon}{label}</span>
      <span className="text-xs font-medium text-[#9BABC8] truncate">{value}</span>
    </div>
  )
}

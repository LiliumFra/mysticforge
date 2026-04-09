import { createClient } from '@/lib/supabase/server'
import { HeroSection } from '@/components/hero/HeroSection'
import { ResourceCard } from '@/components/catalog/ResourceCard'
import Link from 'next/link'
import { ArrowRight, Package } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'MysticForge — Hub IA #1 de 2026 | Agent Skills, MCP Prompts, Cursor Rules',
  description: 'Descarga Agent Skills, MCP Prompts y Cursor Rules con auditoría OWASP automática. El hub más completo de 2026.',
}

export const revalidate = 300 // 5 min cache

async function getHomeData() {
  const supabase = await createClient()

  const [statsResult, featuredResult, packsResult] = await Promise.all([
    supabase.rpc('get_platform_stats'),
    supabase
      .from('resources')
      .select('id, slug, name, display_name, description, type, category, tags, security_score, security_severity, download_count, is_featured, source_repo')
      .eq('is_published', true)
      .eq('is_quarantined', false)
      .order('download_count', { ascending: false })
      .limit(9),
    supabase
      .from('packs')
      .select('id, slug, name, description, icon, color, download_count')
      .eq('is_published', true)
      .eq('is_featured', true)
      .limit(6),
  ])

  const stats = statsResult.data || { total_resources: 0, total_downloads: 0, total_sources: 0 }
  return {
    stats: {
      total_resources: stats.total_resources || 0,
      total_downloads: stats.total_downloads || 0,
      total_sources: stats.total_import_sources || 0,
    },
    featured: featuredResult.data || [],
    packs: packsResult.data || [],
  }
}

export default async function HomePage() {
  const { stats, featured, packs } = await getHomeData()

  return (
    <div>
      {/* Hero */}
      <HeroSection stats={stats} />

      {/* Featured Resources */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-[#00FFC2] text-sm font-semibold tracking-widest uppercase mb-2">Más Populares</p>
            <h2 className="text-3xl font-bold text-[#F0F4FF]">Recursos Destacados</h2>
          </div>
          <Link href="/catalog" className="flex items-center gap-1 text-sm text-[#9BABC8] hover:text-[#00FFC2] transition-colors">
            Ver todo <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {featured.length > 0 ? (
          <div className="bento-grid">
            {featured.map((resource, i) => (
              <ResourceCard key={resource.id} resource={resource as Parameters<typeof ResourceCard>[0]['resource']} index={i} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 glass-card rounded-2xl flex items-center justify-center flex-col min-h-[300px]">
            <Package className="w-12 h-12 text-[#3D4A6B] mb-4" />
            <h3 className="text-[#F0F4FF] font-semibold text-lg mb-2">Sincronizando Recursos</h3>
            <p className="text-[#5A6B8C] text-sm max-w-md">
              El motor automático está recolectando actualmente las mejores Agent Skills y MCP Prompts. Por favor, vuelve más tarde.
            </p>
          </div>
        )}
      </section>

      {/* Packs Section */}
      {packs.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-[#8B5CF6] text-sm font-semibold tracking-widest uppercase mb-2">Colecciones Curadas</p>
              <h2 className="text-3xl font-bold text-[#F0F4FF]">Packs Temáticos</h2>
            </div>
            <Link href="/packs" className="flex items-center gap-1 text-sm text-[#9BABC8] hover:text-[#00FFC2] transition-colors">
              Ver todos <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {packs.map(pack => (
              <Link key={pack.id} href={`/packs/${pack.slug}`}>
                <div className="glass-card rounded-2xl p-5 h-full group cursor-pointer" style={{ borderColor: `${pack.color}20` }}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{pack.icon}</span>
                    <div>
                      <h3 className="font-semibold text-[#F0F4FF] text-sm group-hover:text-[#00FFC2] transition-colors">
                        {pack.name}
                      </h3>
                      <p className="text-xs text-[#5A6B8C]">{pack.download_count} descargas</p>
                    </div>
                  </div>
                  <p className="text-[#9BABC8] text-xs leading-relaxed line-clamp-2">{pack.description}</p>
                  <div className="mt-3 flex items-center gap-1 text-xs font-medium" style={{ color: pack.color }}>
                    <Package className="w-3.5 h-3.5" />
                    Descargar Pack
                    <ArrowRight className="w-3 h-3 ml-auto group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

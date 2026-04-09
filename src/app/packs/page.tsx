import { createClient } from '@/lib/supabase/server'
import { Download, Package } from 'lucide-react'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Packs Temáticos — MysticForge',
  description: 'Colecciones curadas de Agent Skills, MCP Prompts y Cursor Rules. Descarga packs completos con un clic.',
}

export default async function PacksPage() {
  const supabase = await createClient()
  const { data: packs } = await supabase
    .from('packs')
    .select(`
      id, slug, name, description, icon, color, tags, download_count,
      pack_resources(count)
    `)
    .eq('is_published', true)
    .order('is_featured', { ascending: false })
    .order('download_count', { ascending: false })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
      <div className="mb-10">
        <p className="text-[#8B5CF6] text-sm font-semibold tracking-widest uppercase mb-2">Colecciones</p>
        <h1 className="text-4xl font-bold text-[#F0F4FF] mb-2">Packs Temáticos</h1>
        <p className="text-[#9BABC8]">Colecciones curadas de recursos listos para instalar con un clic</p>
      </div>

      {packs && packs.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {packs.map(pack => {
            const count = (pack.pack_resources as Array<{count: number}>)?.[0]?.count || 0
            return (
              <div key={pack.id} className="glass-card rounded-2xl p-6 flex flex-col gap-4 group" style={{ borderColor: `${pack.color}20` }}>
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{pack.icon}</span>
                  <div>
                    <h2 className="font-bold text-[#F0F4FF] group-hover:text-[#00FFC2] transition-colors">{pack.name}</h2>
                    <p className="text-xs text-[#5A6B8C]">{count} recursos · {pack.download_count} descargas</p>
                  </div>
                </div>
                <p className="text-sm text-[#9BABC8] leading-relaxed flex-1">{pack.description}</p>

                {/* Tags */}
                {pack.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {pack.tags.slice(0, 4).map((tag: string) => (
                      <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-[rgba(255,255,255,0.04)] text-[#5A6B8C] border border-[rgba(255,255,255,0.05)]">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t border-[rgba(255,255,255,0.05)]">
                  <Link href={`/packs/${pack.slug}`} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium" style={{ background: `${pack.color}15`, color: pack.color, border: `1px solid ${pack.color}30` }}>
                    <Package className="w-3.5 h-3.5" />
                    Ver Pack
                  </Link>
                  <a
                    href={`/api/download/pack/${pack.id}?target=claude`}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-[rgba(255,255,255,0.04)] text-[#9BABC8] border border-[rgba(255,255,255,0.06)] hover:text-[#00FFC2] hover:border-[rgba(0,255,194,0.2)] transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    ZIP
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-20 glass-card rounded-2xl">
          <Package className="w-12 h-12 text-[#3D4A6B] mx-auto mb-4" />
          <p className="text-[#5A6B8C]">Los packs se crean automáticamente cuando se importan recursos.</p>
        </div>
      )}
    </div>
  )
}

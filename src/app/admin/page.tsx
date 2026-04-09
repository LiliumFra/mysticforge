import { createAdminClient } from '@/lib/supabase/server'
import { Database, Download, Shield, Import, TrendingUp, Package } from 'lucide-react'

export default async function AdminDashboard() {
  const supabase = await createAdminClient()
  const { data: stats } = await supabase.rpc('get_platform_stats')

  const cards = [
    { label: 'Total Recursos', value: stats?.total_resources || 0, icon: Database, color: '#00FFC2', sub: `${stats?.total_skills || 0} skills` },
    { label: 'Total Descargas', value: stats?.total_downloads || 0, icon: Download, color: '#8B5CF6', sub: 'todas las plataformas' },
    { label: 'MCP Prompts', value: stats?.total_mcp_prompts || 0, icon: Package, color: '#EF5777', sub: 'indexados' },
    { label: 'Cursor Rules', value: stats?.total_cursor_rules || 0, icon: TrendingUp, color: '#DFFF00', sub: 'reglas .mdc' },
    { label: 'Packs', value: stats?.total_packs || 0, icon: Package, color: '#FB923C', sub: 'publicados' },
    { label: 'Fuentes Import', value: stats?.total_import_sources || 0, icon: Import, color: '#4F9EFF', sub: 'activas' },
  ]

  return (
    <div>
      <h2 className="text-xl font-bold text-[#F0F4FF] mb-6">Dashboard</h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cards.map(card => (
          <div key={card.label} className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <card.icon className="w-4 h-4" style={{ color: card.color }} />
              <span className="text-xs text-[#5A6B8C]">{card.label}</span>
            </div>
            <div className="text-2xl font-black text-[#F0F4FF]">{(card.value as number).toLocaleString()}</div>
            <div className="text-xs text-[#3D4A6B] mt-0.5">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[#F0F4FF] mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a href="/admin/import" className="flex items-center gap-3 p-3 rounded-xl btn-cyber text-sm">
            <Import className="w-4 h-4" />
            Ejecutar Auto-Import
          </a>
          <a href="/admin/security" className="flex items-center gap-3 p-3 rounded-xl border border-[rgba(239,87,119,0.3)] text-[#EF5777] text-sm hover:bg-[rgba(239,87,119,0.05)]">
            <Shield className="w-4 h-4" />
            Ver Informe Seguridad
          </a>
        </div>
      </div>
    </div>
  )
}

import Link from 'next/link'
import { Sparkles, ExternalLink } from 'lucide-react'

export function Footer() {
  return (
    <footer className="mt-24 border-t border-[rgba(255,255,255,0.05)] bg-[rgba(13,15,20,0.8)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00FFC2] to-[#8B5CF6] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-black" />
              </div>
              <span className="font-bold text-lg">
                <span className="gradient-text-mint">Mystic</span>
                <span className="text-white">Forge</span>
              </span>
            </Link>
            <p className="text-[#5A6B8C] text-sm max-w-xs">
              El hub más completo y seguro del mundo para Agent Skills, MCP Prompts y Cursor Rules en 2026.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <a href="https://github.com/mysticforge" target="_blank" rel="noopener" className="text-[#5A6B8C] hover:text-[#00FFC2] transition-colors">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
              </a>
            </div>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-[#F0F4FF] font-semibold text-sm mb-4">Recursos</h4>
            <ul className="space-y-2 text-sm text-[#5A6B8C]">
              <li><Link href="/catalog" className="hover:text-[#00FFC2] transition-colors">Catálogo</Link></li>
              <li><Link href="/catalog?type=skill" className="hover:text-[#00FFC2] transition-colors">Agent Skills</Link></li>
              <li><Link href="/catalog?type=mcp_prompt" className="hover:text-[#00FFC2] transition-colors">MCP Prompts</Link></li>
              <li><Link href="/catalog?type=cursor_rule" className="hover:text-[#00FFC2] transition-colors">Cursor Rules</Link></li>
              <li><Link href="/packs" className="hover:text-[#00FFC2] transition-colors">Packs Temáticos</Link></li>
            </ul>
          </div>

          {/* Docs */}
          <div>
            <h4 className="text-[#F0F4FF] font-semibold text-sm mb-4">Documentación</h4>
            <ul className="space-y-2 text-sm text-[#5A6B8C]">
              <li><a href="/docs/ARCHITECTURE" className="hover:text-[#00FFC2] transition-colors flex items-center gap-1">Arquitectura <ExternalLink className="w-3 h-3" /></a></li>
              <li><a href="/docs/DATABASE" className="hover:text-[#00FFC2] transition-colors flex items-center gap-1">Base de Datos <ExternalLink className="w-3 h-3" /></a></li>
              <li><a href="/docs/IMPORT-SYSTEM" className="hover:text-[#00FFC2] transition-colors flex items-center gap-1">Sistema Import <ExternalLink className="w-3 h-3" /></a></li>
              <li><a href="/docs/DEPLOYMENT" className="hover:text-[#00FFC2] transition-colors flex items-center gap-1">Deployment <ExternalLink className="w-3 h-3" /></a></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-[rgba(255,255,255,0.05)] flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[#3D4A6B] text-sm">
            © 2026 MysticForge. Construido con ❤️ para la comunidad IA.
          </p>
          <div className="flex items-center gap-2 text-xs text-[#3D4A6B]">
            <span className="w-2 h-2 rounded-full bg-[#00FFC2] animate-pulse"></span>
            Auditoría OWASP AST10 activa
          </div>
        </div>
      </div>
    </footer>
  )
}

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Shield, Database, Download, Import, FileText, BarChart3 } from 'lucide-react'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim())

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
    redirect('/')
  }

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: BarChart3 },
    { href: '/admin/import', label: 'Auto-Import', icon: Import },
    { href: '/admin/resources', label: 'Recursos', icon: Database },
    { href: '/admin/logs', label: 'Logs', icon: FileText },
    { href: '/admin/security', label: 'Seguridad', icon: Shield },
  ]

  return (
    <div className="min-h-screen pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Admin header */}
        <div className="flex items-center gap-3 mb-8 p-4 glass rounded-xl border border-[rgba(239,87,119,0.2)]">
          <Shield className="w-5 h-5 text-[#EF5777]" />
          <div>
            <h1 className="text-sm font-bold text-[#F0F4FF]">Panel de Administración</h1>
            <p className="text-xs text-[#5A6B8C]">{user.email}</p>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Sidebar nav */}
          <aside className="w-48 shrink-0">
            <nav className="space-y-1">
              {navItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-[#9BABC8] hover:text-[#00FFC2] hover:bg-[rgba(0,255,194,0.06)] transition-all"
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}

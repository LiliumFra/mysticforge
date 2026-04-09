'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Menu, X, Sparkles, Globe, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'

export function Navbar() {
  const t = useTranslations('nav')
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [search, setSearch] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (search.trim()) router.push(`/catalog?q=${encodeURIComponent(search)}`)
  }

  const isAdmin = user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL || 
    (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').includes(user?.email || '')

  return (
    <motion.header
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'glass shadow-2xl shadow-black/40' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00FFC2] to-[#8B5CF6] flex items-center justify-center glow-mint">
              <Sparkles className="w-4 h-4 text-black font-bold" />
            </div>
            <span className="font-bold text-lg tracking-tight">
              <span className="gradient-text-mint">Mystic</span>
              <span className="text-white">Forge</span>
            </span>
          </Link>

          {/* Search bar - desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A6B8C]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('search')}
                className="w-full bg-[#131720]/80 border border-[rgba(0,255,194,0.1)] rounded-xl pl-10 pr-4 py-2 text-sm text-[#F0F4FF] placeholder-[#5A6B8C] focus:outline-none focus:border-[rgba(0,255,194,0.4)] focus:bg-[#131720] transition-all"
              />
            </div>
          </form>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink href="/catalog">{t('catalog')}</NavLink>
            <NavLink href="/packs">{t('packs')}</NavLink>
            {isAdmin && (
              <NavLink href="/admin">
                <Shield className="w-3.5 h-3.5 mr-1" />
                {t('admin')}
              </NavLink>
            )}
            <LocaleToggle />
            {user && (
              <button
                onClick={() => supabase.auth.signOut()}
                className="ml-2 text-sm text-[#9BABC8] hover:text-[#00FFC2] transition-colors px-3 py-1.5"
              >
                Sign out
              </button>
            )}
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg text-[#9BABC8] hover:text-[#00FFC2] transition-colors"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass border-t border-[rgba(255,255,255,0.05)]"
          >
            <div className="px-4 py-4 space-y-3">
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A6B8C]" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={t('search')}
                    className="w-full bg-[#131720] border border-[rgba(0,255,194,0.1)] rounded-xl pl-10 pr-4 py-2 text-sm text-[#F0F4FF] placeholder-[#5A6B8C] focus:outline-none"
                  />
                </div>
              </form>
              <Link href="/catalog" className="block py-2 text-[#9BABC8] hover:text-[#00FFC2]">{t('catalog')}</Link>
              <Link href="/packs" className="block py-2 text-[#9BABC8] hover:text-[#00FFC2]">{t('packs')}</Link>
              {isAdmin && <Link href="/admin" className="block py-2 text-[#9BABC8] hover:text-[#00FFC2]">{t('admin')}</Link>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center px-3 py-1.5 rounded-lg text-sm text-[#9BABC8] hover:text-[#00FFC2] hover:bg-[rgba(0,255,194,0.06)] transition-all"
    >
      {children}
    </Link>
  )
}

function LocaleToggle() {
  const [locale, setLocale] = useState('es')

  function toggle() {
    const next = locale === 'es' ? 'en' : 'es'
    setLocale(next)
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000`
    window.location.reload()
  }

  return (
    <button onClick={toggle} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-[#9BABC8] hover:text-[#00FFC2] hover:bg-[rgba(0,255,194,0.06)] transition-all">
      <Globe className="w-3.5 h-3.5" />
      {locale.toUpperCase()}
    </button>
  )
}

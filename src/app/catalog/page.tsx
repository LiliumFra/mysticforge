'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, SlidersHorizontal, X, Loader2 } from 'lucide-react'
import { ResourceCard } from '@/components/catalog/ResourceCard'

type Resource = {
  id: string
  slug: string
  name: string
  display_name: string
  description: string
  type: 'skill' | 'mcp_prompt' | 'cursor_rule' | 'prompt'
  category: string
  tags: string[]
  security_score: number
  security_severity: 'clean' | 'low' | 'medium' | 'high' | 'critical'
  download_count: number
  is_featured: boolean
  source_repo?: string
}

const CATEGORIES = ['general', 'frontend', 'backend', 'devops', 'security', 'data', 'ai', 'testing', 'documentation', 'design']
const TYPES = [
  { value: '', label: 'Todos los tipos' },
  { value: 'skill', label: 'Agent Skill' },
  { value: 'mcp_prompt', label: 'MCP Prompt' },
  { value: 'cursor_rule', label: 'Cursor Rule' },
  { value: 'prompt', label: 'Prompt' },
]
const SORTS = [
  { value: 'downloads', label: 'Más descargados' },
  { value: 'newest', label: 'Más nuevos' },
  { value: 'security', label: 'Mejor seguridad' },
  { value: 'name', label: 'Nombre A-Z' },
]

export default function CatalogPage() {
  const t = useTranslations('catalog')
  const searchParams = useSearchParams()
  const router = useRouter()

  const [resources, setResources] = useState<Resource[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [type, setType] = useState(searchParams.get('type') || '')
  const [category, setCategory] = useState(searchParams.get('category') || '')
  const [sort, setSort] = useState('downloads')
  const [offset, setOffset] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const LIMIT = 24

  const fetchResources = useCallback(async (reset = false) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    if (type) params.set('type', type)
    if (category) params.set('category', category)
    params.set('sort', sort)
    params.set('limit', String(LIMIT))
    params.set('offset', String(reset ? 0 : offset))

    try {
      const res = await fetch(`/api/search?${params}`)
      const data = await res.json()
      if (reset) {
        setResources(data.resources || [])
        setOffset(0)
      } else {
        setResources(prev => [...prev, ...(data.resources || [])])
      }
      setTotal(data.total || 0)
    } catch {}
    setLoading(false)
  }, [search, type, category, sort, offset])

  useEffect(() => { fetchResources(true) }, [search, type, category, sort])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const url = new URL(window.location.href)
    if (search) url.searchParams.set('q', search); else url.searchParams.delete('q')
    router.push(url.pathname + url.search, { scroll: false })
    fetchResources(true)
  }

  function clearFilters() {
    setSearch(''); setType(''); setCategory('')
  }

  const hasFilters = search || type || category

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[#00FFC2] text-sm font-semibold tracking-widest uppercase mb-2">Explorar</p>
        <h1 className="text-4xl font-bold text-[#F0F4FF] mb-2">{t('title')}</h1>
        <p className="text-[#9BABC8]">{t('subtitle')}</p>
      </div>

      {/* Search + Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A6B8C]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, descripción, tags..."
            className="w-full bg-[#131720] border border-[rgba(0,255,194,0.1)] rounded-xl pl-10 pr-4 py-3 text-sm text-[#F0F4FF] placeholder-[#5A6B8C] focus:outline-none focus:border-[rgba(0,255,194,0.4)] transition-all"
          />
        </form>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${showFilters ? 'btn-cyber' : 'bg-[#131720] border border-[rgba(255,255,255,0.08)] text-[#9BABC8] hover:border-[rgba(0,255,194,0.2)]'}`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filtros
          {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-[#00FFC2]" />}
        </button>
      </div>

      {/* Filters panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass rounded-xl p-4 mb-6"
          >
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs text-[#5A6B8C] mb-1.5">Tipo</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value)}
                  className="w-full bg-[#1A2030] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[#F0F4FF] focus:outline-none focus:border-[rgba(0,255,194,0.3)]"
                >
                  {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs text-[#5A6B8C] mb-1.5">Categoría</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-[#1A2030] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[#F0F4FF] focus:outline-none focus:border-[rgba(0,255,194,0.3)]"
                >
                  <option value="">Todas las categorías</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs text-[#5A6B8C] mb-1.5">Orden</label>
                <select
                  value={sort}
                  onChange={e => setSort(e.target.value)}
                  className="w-full bg-[#1A2030] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[#F0F4FF] focus:outline-none focus:border-[rgba(0,255,194,0.3)]"
                >
                  {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              {hasFilters && (
                <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-[#EF5777] border border-[rgba(239,87,119,0.2)] hover:bg-[rgba(239,87,119,0.05)] transition-all">
                  <X className="w-4 h-4" /> Limpiar
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results count */}
      {!loading && (
        <p className="text-sm text-[#9BABC8] mb-4">
          {total > 0 ? `${total.toLocaleString()} recursos encontrados` : 'Sin resultados'}
          {search && <span className="text-[#00FFC2]"> para "{search}"</span>}
        </p>
      )}

      {/* Grid */}
      {loading && resources.length === 0 ? (
        <div className="bento-grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="glass-card rounded-2xl h-48 shimmer" />
          ))}
        </div>
      ) : resources.length > 0 ? (
        <>
          <div className="bento-grid">
            {resources.map((r, i) => (
              <ResourceCard key={r.id} resource={r} index={i} />
            ))}
          </div>
          {/* Load more */}
          {resources.length < total && (
            <div className="flex justify-center mt-10">
              <button
                onClick={() => { setOffset(prev => prev + LIMIT); fetchResources() }}
                disabled={loading}
                className="btn-cyber px-6 py-2.5 rounded-xl text-sm flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Cargar más ({total - resources.length} restantes)
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20 glass-card rounded-2xl">
          <Search className="w-12 h-12 text-[#3D4A6B] mx-auto mb-4" />
          <h3 className="text-[#F0F4FF] font-semibold text-lg mb-2">{t('no_results')}</h3>
          <p className="text-[#5A6B8C] text-sm">Prueba con otros términos o importa más recursos desde el Admin Panel</p>
        </div>
      )}
    </div>
  )
}

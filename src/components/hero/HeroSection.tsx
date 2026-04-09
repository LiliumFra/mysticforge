'use client'
import { motion, useAnimation } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { ArrowRight, Shield, Zap, Download, Search } from 'lucide-react'

interface Stats {
  total_resources: number
  total_downloads: number
  total_sources: number
}

export function HeroSection({ stats }: { stats: Stats }) {
  const t = useTranslations('hero')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles: Array<{x: number, y: number, vx: number, vy: number, life: number, maxLife: number, size: number, color: string}> = []
    const colors = ['#00FFC2', '#8B5CF6', '#EF5777', '#DFFF00']

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        life: Math.random() * 100,
        maxLife: 100 + Math.random() * 100,
        size: 1 + Math.random() * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
      })
    }

    let animId: number
    function animate() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        p.life++
        if (p.life > p.maxLife) { p.life = 0; p.x = Math.random() * canvas.width; p.y = Math.random() * canvas.height }
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1

        const opacity = Math.sin((p.life / p.maxLife) * Math.PI) * 0.6
        ctx.globalAlpha = opacity
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }
      animId = requestAnimationFrame(animate)
    }
    animate()

    const handleResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    window.addEventListener('resize', handleResize)
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', handleResize) }
  }, [])

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Particle canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ opacity: 0.35 }} />

      {/* Radial gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(139,92,246,0.15)_0%,transparent_60%)]" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[rgba(0,255,194,0.3)] bg-[rgba(0,255,194,0.06)] text-[#00FFC2] text-sm font-medium mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#00FFC2] animate-pulse" />
          {t('badge')}
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight mb-6 leading-[1.05]"
        >
          {t('title')}{' '}
          <span className="gradient-text-hero block sm:inline">{t('titleHighlight')}</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="text-[#9BABC8] text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          {t('subtitle')}
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="flex flex-wrap items-center justify-center gap-4 mb-16"
        >
          <Link href="/catalog" className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#00FFC2] to-[#00D4FF] text-black font-bold text-base hover:opacity-90 transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(0,255,194,0.4)]">
            <Search className="w-4 h-4" />
            {t('cta_explore')}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link href="/packs" className="flex items-center gap-2 px-6 py-3 rounded-xl btn-cyber text-base">
            <Download className="w-4 h-4" />
            Ver Packs
          </Link>
        </motion.div>

        {/* Stats grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.45 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto"
        >
          <StatCard
            value={stats.total_resources}
            label={t('stats_resources')}
            icon={<Zap className="w-5 h-5 text-[#00FFC2]" />}
            color="mint"
          />
          <StatCard
            value={stats.total_downloads}
            label={t('stats_downloads')}
            icon={<Download className="w-5 h-5 text-[#8B5CF6]" />}
            color="violet"
          />
          <StatCard
            value={stats.total_sources}
            label={t('stats_sources')}
            icon={<Search className="w-5 h-5 text-[#EF5777]" />}
            color="rose"
          />
          <StatCard
            value={98}
            label={t('stats_security')}
            icon={<Shield className="w-5 h-5 text-[#DFFF00]" />}
            color="acid"
            suffix="%"
          />
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-[#0D0F14] to-transparent pointer-events-none" />
    </section>
  )
}

function StatCard({ value, label, icon, color, suffix = '' }: {
  value: number; label: string; icon: React.ReactNode; color: string; suffix?: string
}) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const duration = 2000
    const start = Date.now()
    const timer = setInterval(() => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.floor(eased * value))
      if (progress >= 1) clearInterval(timer)
    }, 16)
    return () => clearInterval(timer)
  }, [value])

  const borderColor: Record<string, string> = {
    mint: 'rgba(0,255,194,0.15)',
    violet: 'rgba(139,92,246,0.15)',
    rose: 'rgba(239,87,119,0.15)',
    acid: 'rgba(223,255,0,0.15)',
  }

  return (
    <div className="glass-card rounded-xl p-4 text-center" style={{ borderColor: borderColor[color] }}>
      <div className="flex justify-center mb-2">{icon}</div>
      <div className="text-2xl font-black text-[#F0F4FF]">
        {display.toLocaleString()}{suffix}
      </div>
      <div className="text-xs text-[#5A6B8C] mt-1">{label}</div>
    </div>
  )
}

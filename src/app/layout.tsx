import type { Metadata } from 'next'
import { getLocale, getMessages } from 'next-intl/server'
import { NextIntlClientProvider } from 'next-intl'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'MysticForge — Hub IA #1 de 2026 | Agent Skills, MCP Prompts, Cursor Rules',
    template: '%s | MysticForge',
  },
  description: 'El hub más completo y seguro del mundo para Agent Skills, MCP Prompts y Cursor Rules. Búsqueda semántica, auditoría OWASP automática y descargas ZIP instantáneas.',
  keywords: ['agent skills', 'mcp prompts', 'cursor rules', 'claude skills', 'ai agents', 'SKILL.md', 'MCP', 'AI hub'],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://mysticforge.ai'),
  openGraph: {
    title: 'MysticForge — Hub IA #1 de 2026',
    description: 'El arsenal definitivo para agentes de IA en 2026',
    type: 'website',
    locale: 'es_ES',
    alternateLocale: 'en_US',
  },
  twitter: { card: 'summary_large_image', title: 'MysticForge', description: 'Hub IA #1 de 2026' },
  manifest: '/manifest.json',
}

export const viewport = {
  themeColor: '#00FFC2',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} className={`dark ${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="bg-cyber-mesh min-h-screen" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
        <NextIntlClientProvider messages={messages}>
          <div className="relative flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 relative z-10">
              {children}
            </main>
            <Footer />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}

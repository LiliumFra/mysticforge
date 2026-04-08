import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'raw.githubusercontent.com' },
      { protocol: 'https', hostname: 'giohgsedijmoiiolvuxm.supabase.co' },
    ],
  },
  // Don't double-compress when behind Vercel/Cloudflare CDN
  compress: false,
  experimental: {
    after: true,
  },
}

export default withNextIntl(nextConfig)

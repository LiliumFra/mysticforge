import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { buildPackZip, type DownloadTarget } from '@/lib/downloads/zip-builder'
import { after } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const target = (request.nextUrl.searchParams.get('target') || 'claude') as DownloadTarget

  const supabase = await createAdminClient()

  const { data: pack } = await supabase
    .from('packs')
    .select(`
      id, slug, name, download_count,
      pack_resources(
        resources(id, slug, name, display_name, description, type, content, scripts)
      )
    `)
    .or(`id.eq.${id},slug.eq.${id}`)
    .eq('is_published', true)
    .single()

  if (!pack) {
    return NextResponse.json({ error: 'Pack not found' }, { status: 404 })
  }

  // Flatten resources
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resources = ((pack as any).pack_resources || [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((pr: any) => pr.resources)
    .flat()
    .filter(Boolean)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((r: any) => ({
      slug: r.slug,
      name: r.name,
      display_name: r.display_name,
      content: r.content,
      type: r.type,
      scripts: r.scripts || [],
    }))

  try {
    const zipBytes = await buildPackZip(pack.name, resources, target)

    after(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const currentCount = (pack as any).download_count || 0
      await supabase.from('packs').update({
        download_count: currentCount + 1,
      }).eq('id', pack.id)
    })

    return new NextResponse(Buffer.from(zipBytes), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${pack.slug}-${target}.zip"`,
        'Content-Length': zipBytes.byteLength.toString(),
        'Cache-Control': 'no-store',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to generate pack ZIP' }, { status: 500 })
  }
}

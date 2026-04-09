import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { buildResourceZip, type DownloadTarget } from '@/lib/downloads/zip-builder'
import { after } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const searchParams = request.nextUrl.searchParams
  const target = (searchParams.get('target') || 'claude') as DownloadTarget

  const supabase = await createClient()

  const { data: resource, error } = await supabase
    .from('resources')
    .select('id, slug, name, display_name, description, type, content, scripts')
    .or(`id.eq.${id},slug.eq.${id}`)
    .eq('is_published', true)
    .eq('is_quarantined', false)
    .single()

  if (error || !resource) {
    return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
  }

  try {
    const zipBytes = await buildResourceZip(
      {
        slug: resource.slug,
        name: resource.name,
        display_name: resource.display_name,
        content: resource.content,
        type: resource.type,
        scripts: resource.scripts as Array<{name: string, content: string}> || [],
      },
      target
    )

    const filename = `${resource.slug}-${target}.zip`

    // Log download AFTER response is sent (unstable_after)
    after(async () => {
      await supabase.rpc('increment_download', { resource_id_param: resource.id })
      await supabase.from('analytics').insert({
        resource_id: resource.id,
        event_type: 'download',
        target_platform: target,
      })
    })

    return new NextResponse(Buffer.from(zipBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': zipBytes.byteLength.toString(),
        'Cache-Control': 'no-store',
        'X-MysticForge-Target': target,
      },
    })
  } catch (err) {
    console.error('ZIP generation error:', err)
    return NextResponse.json({ error: 'Failed to generate ZIP' }, { status: 500 })
  }
}

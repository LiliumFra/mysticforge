import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { importFromSource } from '@/lib/import/auto-import'

// Vercel Cron Jobs always send a GET request
export async function GET(request: NextRequest) {
  // 1. Verificar Autenticación Estricta de Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (process.env.NODE_ENV !== 'development' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized CRON trigger' }, { status: 401 })
  }

  const supabase = await createAdminClient()

  // 2. Traer todos los repositorios activos
  const { data: sources, error } = await supabase.from('import_sources').select('*').eq('is_active', true)
  if (error || !sources?.length) {
    return NextResponse.json({ error: 'No active import sources found' }, { status: 400 })
  }

  // 3. Crear log de ejecución (Triggered by System Cron)
  const { data: logEntry } = await supabase.from('import_logs').insert({
    source_id: sources[0].id,
    status: 'running',
    triggered_by: '00000000-0000-0000-0000-000000000000', // System ID
  }).select('id').single()

  const logId = logEntry?.id || 'unknown'
  const allResults = []

  // 4. Ejecutar el Auto-Import en todos los repositorios (Deduplicando automáticamente)
  for (const source of sources) {
    try {
      const result = await importFromSource({
        id: source.id,
        owner: source.owner,
        repo: source.repo,
        branch: source.branch,
        path_filter: source.path_filter || '',
      }, logId)

      allResults.push({ source: `${source.owner}/${source.repo}`, ...result })

      await supabase.from('import_logs').update({
        status: 'completed',
        files_scanned: result.files_scanned,
        files_new: result.files_new,
        files_updated: result.files_updated,
        files_skipped: result.files_skipped,
        files_quarantined: result.files_quarantined,
        files_failed: result.files_failed,
        log_details: result.log_details,
        completed_at: new Date().toISOString(),
      }).eq('id', logId)
    } catch (err) {
      await supabase.from('import_logs').update({
        status: 'failed',
        error_message: String(err),
        completed_at: new Date().toISOString(),
      }).eq('id', logId)
    }
  }

  return NextResponse.json({ success: true, log_id: logId, results: allResults })
}

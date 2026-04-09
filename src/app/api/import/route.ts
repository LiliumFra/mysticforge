import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { importFromSource } from '@/lib/import/auto-import'
import { createClient } from '@/lib/supabase/server'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim())

async function verifyAdmin(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
    return null
  }
  return user
}

export async function POST(request: NextRequest) {
  const user = await verifyAdmin(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createAdminClient()
  const body = await request.json().catch(() => ({}))
  const { source_id } = body

  // Get source config
  let sourcesQuery = supabase.from('import_sources').select('*').eq('is_active', true)
  if (source_id) sourcesQuery = sourcesQuery.eq('id', source_id)

  const { data: sources, error } = await sourcesQuery
  if (error || !sources?.length) {
    return NextResponse.json({ error: 'No active import sources found' }, { status: 400 })
  }

  // Create import log entry
  const { data: logEntry } = await supabase.from('import_logs').insert({
    source_id: sources[0].id,
    status: 'running',
    triggered_by: user.id,
  }).select('id').single()

  const logId = logEntry?.id || 'unknown'
  const allResults = []

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

      // Update log
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

export async function GET(request: NextRequest) {
  const user = await verifyAdmin(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createAdminClient()
  const { data: sources } = await supabase.from('import_sources').select('*').order('name')
  const { data: logs } = await supabase
    .from('import_logs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ sources, logs })
}

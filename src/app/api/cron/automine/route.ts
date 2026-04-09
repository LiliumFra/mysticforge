import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { importFromSource } from '@/lib/import/auto-import'

export async function POST(request: NextRequest) {
  // Validate token sent from GitHub Actions or Vercel Cron
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  const isValidCronSecret = process.env.CRON_SECRET && token === process.env.CRON_SECRET;
  const isValidGitHubToken = process.env.GITHUB_TOKEN && token === process.env.GITHUB_TOKEN;

  // We bypass auth in development, but in prod we require either the Vercel CRON_SECRET or the PAT (GITHUB_TOKEN)
  if (process.env.NODE_ENV !== 'development' && !isValidCronSecret && !isValidGitHubToken) {
    return NextResponse.json({ error: 'Unauthorized CRON trigger' }, { status: 401 });
  }

  const supabase = await createAdminClient()
  const body = await request.json().catch(() => ({}))
  const { owner, repo, default_branch } = body

  if (!owner || !repo) {
    return NextResponse.json({ error: 'Missing owner/repo' }, { status: 400 })
  }

  // Check if source is already registered
  let { data: source } = await supabase.from('import_sources').select('*').eq('owner', owner).eq('repo', repo).single()

  // If new, automatically register it active
  if (!source) {
    const { data: newSource, error } = await supabase.from('import_sources').insert({
      name: `${owner}/${repo}`,
      owner,
      repo,
      branch: default_branch || 'main',
      path_filter: '',
      is_active: true
    }).select().single()
    
    if (error) return NextResponse.json({ error: String(error) }, { status: 500 })
    source = newSource
  }

  if (!source?.is_active) {
    return NextResponse.json({ status: 'skipped', message: 'Source is inactive' })
  }

  // Create isolated log event for this specific miner process
  const { data: logEntry } = await supabase.from('import_logs').insert({
    source_id: source.id,
    status: 'running',
    triggered_by: '00000000-0000-0000-0000-000000000000', // System
  }).select('id').single()

  const logId = logEntry?.id || 'unknown'

  try {
    const result = await importFromSource({
      id: source.id,
      owner: source.owner,
      repo: source.repo,
      branch: source.branch,
      path_filter: source.path_filter || '',
    }, logId)

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

    return NextResponse.json({ success: true, result })
  } catch (err) {
    await supabase.from('import_logs').update({
      status: 'failed',
      error_message: String(err),
      completed_at: new Date().toISOString(),
    }).eq('id', logId)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

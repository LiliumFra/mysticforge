import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const searchParams = request.nextUrl.searchParams
  const q = searchParams.get('q') || ''
  const type = searchParams.get('type') || null
  const category = searchParams.get('category') || null
  const sort = searchParams.get('sort') || 'downloads'
  const limit = Math.min(parseInt(searchParams.get('limit') || '24'), 100)
  const offset = parseInt(searchParams.get('offset') || '0')

  if (!q) {
    // Browse mode - ordered listing
    let query = supabase
      .from('resources')
      .select('id, slug, name, display_name, description, type, category, tags, security_score, security_severity, download_count, is_featured, created_at, compatible_with, source_repo')
      .eq('is_published', true)
      .eq('is_quarantined', false)

    if (type) query = query.eq('type', type)
    if (category) query = query.eq('category', category)

    if (sort === 'downloads') query = query.order('download_count', { ascending: false })
    else if (sort === 'newest') query = query.order('created_at', { ascending: false })
    else if (sort === 'security') query = query.order('security_score', { ascending: false })
    else if (sort === 'name') query = query.order('name', { ascending: true })
    else query = query.order('download_count', { ascending: false })

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ resources: data, total: count, offset, limit })
  }

  // Hybrid search mode
  try {
    // Try to get embedding for semantic search
    let embedding: number[] | null = null
    
    if (process.env.JINA_API_KEY) {
      try {
        const jinaResponse = await fetch('https://api.jina.ai/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.JINA_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'jina-embeddings-v3',
            input: [q],
            task: 'retrieval.query',
          }),
        })
        if (jinaResponse.ok) {
          const data = await jinaResponse.json()
          embedding = data.data?.[0]?.embedding || null
        }
      } catch {}
    }

    let results
    if (embedding) {
      // Full hybrid search via pgvector + FTS + RRF
      const { data, error } = await supabase.rpc('hybrid_search', {
        query_text: q,
        query_embedding: JSON.stringify(embedding),
        match_count: limit,
        filter_type: type || null,
        filter_category: category || null,
      })
      if (!error) results = data
    }

    if (!results) {
      // Fallback to FTS-only
      const { data, error } = await supabase.rpc('fts_search', {
        query_text: q,
        match_count: limit,
        filter_type: type || null,
        filter_category: category || null,
      })
      if (!error) results = data
    }

    if (!results) {
      // Final fallback: simple ILIKE
      const { data } = await supabase
        .from('resources')
        .select('id, slug, name, display_name, description, type, category, tags, security_score, security_severity, download_count, is_featured, created_at')
        .eq('is_published', true)
        .eq('is_quarantined', false)
        .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
        .limit(limit)
      results = data
    }

    // Log search analytics
    await supabase.from('analytics').insert({
      event_type: 'search',
      search_query: q,
    })

    return NextResponse.json({ resources: results || [], total: results?.length || 0, query: q })
  } catch (err) {
    return NextResponse.json({ error: 'Search failed', detail: String(err) }, { status: 500 })
  }
}

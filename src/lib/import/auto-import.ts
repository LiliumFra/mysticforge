// Auto-import system using Octokit + Git Trees API + SHA256 deduplication

import { Octokit } from '@octokit/rest'
import { createCryptoHash } from './crypto'
import { scanContent } from '../security/scanner'
import { createAdminClient } from '../supabase/server'

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  userAgent: 'MysticForge/1.0 (+https://mysticforge.ai)',
})

export interface ImportSourceConfig {
  id: string
  owner: string
  repo: string
  branch: string
  path_filter: string
}

export interface ImportResult {
  files_scanned: number
  files_new: number
  files_updated: number
  files_skipped: number
  files_quarantined: number
  files_failed: number
  log_details: Array<{type: string, path: string, message: string}>
}

// SKILL.md / MDC / prompt file patterns
const SKILL_PATTERNS = [
  /SKILL\.md$/i,
  /\.mdc$/i,
  /prompts\/.*\.json$/i,
  /\.claude\/skills\/.*SKILL\.md$/i,
]

function isRelevantFile(path: string): boolean {
  return SKILL_PATTERNS.some(p => p.test(path))
}

type ResourceType = 'skill' | 'mcp_prompt' | 'cursor_rule' | 'prompt'

function detectType(path: string, content: string): ResourceType {
  if (path.endsWith('.mdc') || path.includes('.cursor/rules/')) return 'cursor_rule'
  if (path.includes('mcp') || path.includes('prompts/')) {
    try { JSON.parse(content); return 'mcp_prompt' } catch {}
  }
  if (path.includes('SKILL.md') || content.includes('---\nname:')) return 'skill'
  return 'prompt'
}

interface YAMLFrontmatter {
  name?: string
  description?: string
  version?: string
  category?: string
  tags?: string[]
  compatible_with?: string[]
}

function parseSkillFrontmatter(content: string): YAMLFrontmatter {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return {}
  
  const yaml = match[1]
  const result: YAMLFrontmatter = {}
  
  const nameMatch = yaml.match(/^name:\s*["']?([^"'\n]+)["']?/m)
  const descMatch = yaml.match(/^description:\s*["']?([^"'\n]+)["']?/m)
  const versionMatch = yaml.match(/^version:\s*["']?([^"'\n]+)["']?/m)
  const categoryMatch = yaml.match(/^category:\s*["']?([^"'\n]+)["']?/m)
  const tagsMatch = yaml.match(/^tags:\s*\[([^\]]+)\]/m)
  const compatMatch = yaml.match(/^compatible_with:\s*\[([^\]]+)\]/m)

  if (nameMatch) result.name = nameMatch[1].trim()
  if (descMatch) result.description = descMatch[1].trim()
  if (versionMatch) result.version = versionMatch[1].trim()
  if (categoryMatch) result.category = categoryMatch[1].trim()
  if (tagsMatch) result.tags = tagsMatch[1].split(',').map(t => t.trim().replace(/['"]/g, ''))
  if (compatMatch) result.compatible_with = compatMatch[1].split(',').map(t => t.trim().replace(/['"]/g, ''))

  return result
}

function slugify(name: string, owner: string, repo: string, path: string): string {
  const base = name || path.split('/').slice(-2, -1)[0] || 'resource'
  return `${owner}-${repo}-${base}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

export async function importFromSource(source: ImportSourceConfig, logId: string): Promise<ImportResult> {
  const supabase = await createAdminClient()
  const result: ImportResult = {
    files_scanned: 0,
    files_new: 0,
    files_updated: 0,
    files_skipped: 0,
    files_quarantined: 0,
    files_failed: 0,
    log_details: [],
  }

  try {
    // Step 1: Get the full tree via Git Trees API (single API call!)
    const { data: refData } = await octokit.rest.git.getRef({
      owner: source.owner,
      repo: source.repo,
      ref: `heads/${source.branch}`,
    })
    const treeSha = refData.object.sha

    const { data: treeData } = await octokit.rest.git.getTree({
      owner: source.owner,
      repo: source.repo,
      tree_sha: treeSha,
      recursive: '1',
    })

    // Step 2: Filter to relevant files only
    const relevantFiles = treeData.tree.filter(item => 
      item.type === 'blob' && 
      item.path && 
      isRelevantFile(item.path) &&
      (!source.path_filter || item.path.startsWith(source.path_filter))
    )

    result.files_scanned = relevantFiles.length

    // Step 3: Batch deduplication check against existing git SHAs
    const gitShas = relevantFiles.map(f => f.sha!).filter(Boolean)
    const { data: existingVersions } = await supabase
      .from('resource_versions')
      .select('git_sha, resource_id')
      .in('git_sha', gitShas)

    const existingShaSet = new Set((existingVersions || []).map(v => v.git_sha))

    // Step 4: Download only new/changed files
    for (const file of relevantFiles) {
      if (!file.path || !file.sha) continue

      // SHA deduplication - skip if unchanged
      if (existingShaSet.has(file.sha)) {
        result.files_skipped++
        continue
      }

      try {
        // Download raw content
        const rawResponse = await octokit.rest.repos.getContent({
          owner: source.owner,
          repo: source.repo,
          path: file.path,
        })

        const fileData = rawResponse.data
        let rawContent = ''
        if ('content' in fileData) {
          rawContent = Buffer.from(fileData.content, 'base64').toString('utf-8')
        } else {
          result.files_failed++
          continue
        }

        // Step 5: Parse frontmatter
        const meta = parseSkillFrontmatter(rawContent)
        const resourceType = detectType(file.path, rawContent)

        // Step 6: Security scan
        const securityReport = scanContent(rawContent)
        const shouldQuarantine = securityReport.severity === 'critical'

        // Step 7: Compute hash
        const sha256 = createCryptoHash(rawContent)

        // Step 8: Check if resource exists by slug for update vs insert
        const slug = slugify(meta.name || '', source.owner, source.repo, file.path)
        const displayName = meta.name || file.path.split('/').pop()?.replace(/\.md(c)?$/, '') || slug
        const description = meta.description || `Resource from ${source.owner}/${source.repo}`
        const category = meta.category || 'general'
        const sourceUrl = `https://github.com/${source.owner}/${source.repo}/blob/${source.branch}/${file.path}`

        const { data: existingResource } = await supabase
          .from('resources')
          .select('id')
          .eq('slug', slug)
          .single()

        if (existingResource) {
          // Update existing
          await supabase.from('resources').update({
            content: rawContent,
            raw_content: rawContent,
            sha256_hash: sha256,
            git_sha: file.sha,
            security_score: securityReport.score,
            security_severity: securityReport.severity,
            security_findings: securityReport.findings,
            security_scanned_at: securityReport.scanned_at,
            is_quarantined: shouldQuarantine,
            quarantine_reason: shouldQuarantine ? `Security severity: ${securityReport.severity}` : null,
            updated_at: new Date().toISOString(),
          }).eq('id', existingResource.id)

          await supabase.from('resource_versions').insert({
            resource_id: existingResource.id,
            version: meta.version || '1.0.0',
            sha256_hash: sha256,
            git_sha: file.sha,
            content: rawContent,
          })

          result.files_updated++
          result.log_details.push({ type: 'updated', path: file.path, message: shouldQuarantine ? 'Updated + quarantined' : 'Updated' })
        } else {
          // Insert new
          const { data: newResource } = await supabase.from('resources').insert({
            slug,
            name: (meta.name || displayName).slice(0, 64),
            display_name: displayName,
            description: description.slice(0, 1024),
            type: resourceType,
            category,
            tags: meta.tags || [],
            content: rawContent,
            raw_content: rawContent,
            source_repo: `${source.owner}/${source.repo}`,
            source_path: file.path,
            source_url: sourceUrl,
            sha256_hash: sha256,
            git_sha: file.sha,
            cli_source: 'github',
            cli_package: `${source.owner}/${source.repo}`,
            compatible_with: meta.compatible_with || ['claude', 'gemini'],
            version: meta.version || '1.0.0',
            security_score: securityReport.score,
            security_severity: securityReport.severity,
            security_findings: securityReport.findings,
            security_scanned_at: securityReport.scanned_at,
            is_quarantined: shouldQuarantine,
            quarantine_reason: shouldQuarantine ? `Security severity: ${securityReport.severity}` : null,
            import_source_id: source.id,
          }).select('id').single()

          if (newResource) {
            await supabase.from('resource_versions').insert({
              resource_id: newResource.id,
              version: meta.version || '1.0.0',
              sha256_hash: sha256,
              git_sha: file.sha,
              content: rawContent,
            })
          }

          if (shouldQuarantine) {
            result.files_quarantined++
            result.log_details.push({ type: 'quarantined', path: file.path, message: `Critical security finding: ${securityReport.severity}` })
          } else {
            result.files_new++
            result.log_details.push({ type: 'new', path: file.path, message: 'Imported successfully' })
          }
        }

        // Small delay to respect GitHub rate limits
        await new Promise(r => setTimeout(r, 100))

      } catch (err) {
        result.files_failed++
        result.log_details.push({ type: 'error', path: file.path, message: String(err) })
      }
    }

    // Update import source last synced
    await supabase.from('import_sources').update({
      last_synced_at: new Date().toISOString(),
      last_tree_sha: treeSha,
      total_imported: relevantFiles.length,
    }).eq('id', source.id)

  } catch (err) {
    result.log_details.push({ type: 'fatal', path: '', message: String(err) })
  }

  return result
}

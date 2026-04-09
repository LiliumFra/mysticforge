import { Octokit } from '@octokit/rest'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

async function run() {
  console.log("-> Iniciando Zero-Config Auto-Import local con repos target...")
  const targetRepos = [
    { owner: 'OWASP', name: 'www-project-agentic-skills-top-10', default_branch: 'main' },
    { owner: 'snyk', name: 'agent-scan', default_branch: 'main' },
    { owner: 'cisco-ai-defense', name: 'skill-scanner', default_branch: 'main' },
    { owner: 'agentskills', name: 'agentskills', default_branch: 'main' },
    { owner: 'anthropics', name: 'skills', default_branch: 'main' },
    { owner: 'modelcontextprotocol', name: 'registry', default_branch: 'main' },
    { owner: 'modelcontextprotocol', name: 'servers', default_branch: 'main' }
  ]
  
  console.log(`-> Inyectando ${targetRepos.length} repositorios a Supabase...`)
  
  for (const repo of targetRepos) {
    console.log(`Procesando: ${repo.owner}/${repo.name}`)
    try {
      const res = await fetch(`${APP_URL}/api/cron/automine`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`
        },
        body: JSON.stringify({
          owner: repo.owner,
          repo: repo.name,
          default_branch: repo.default_branch
        })
      });
      const data = await res.json()
      console.log(`[${repo.name}] Status:`, res.status, data.success ? 'OK' : data.error)
    } catch (e) {
      console.error(`Error con ${repo.name}:`, e)
    }
  }
}

run().catch(console.error)

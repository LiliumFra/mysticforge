import JSZip from 'jszip'

export type DownloadTarget = 'claude' | 'cursor' | 'gemini' | 'raw'

interface ResourceData {
  slug: string
  name: string
  display_name: string
  content: string
  type: string
  scripts?: Array<{name: string, content: string, path?: string}>
}

/**
 * Build a ZIP file with the correct directory structure for each AI platform.
 * 
 * Claude:  .claude/skills/<name>/SKILL.md
 * Cursor:  .cursor/rules/<name>.mdc
 * Gemini:  .gemini/skills/<name>/SKILL.md
 * Raw:     <name>/SKILL.md (or <name>.mdc for cursor rules)
 */
export async function buildResourceZip(resource: ResourceData, target: DownloadTarget): Promise<Uint8Array> {
  const zip = new JSZip()
  const skillName = resource.name.toLowerCase().replace(/[^a-z0-9-]/g, '-')

  if (target === 'claude') {
    const basePath = `.claude/skills/${skillName}/`
    zip.file(`${basePath}SKILL.md`, resource.content)
    if (resource.scripts?.length) {
      for (const script of resource.scripts) {
        zip.file(`${basePath}scripts/${script.name}`, script.content)
      }
    }
    zip.file(`${basePath}README.md`, generateReadme(resource, target))
  } else if (target === 'cursor') {
    const isMdc = resource.type === 'cursor_rule' || resource.content.includes('alwaysApply:') || resource.content.includes('globs:')
    if (isMdc) {
      zip.file(`.cursor/rules/${skillName}.mdc`, resource.content)
    } else {
      // Convert SKILL.md to .mdc format
      const mdcContent = convertToMdc(resource)
      zip.file(`.cursor/rules/${skillName}.mdc`, mdcContent)
    }
  } else if (target === 'gemini') {
    const basePath = `.gemini/skills/${skillName}/`
    zip.file(`${basePath}SKILL.md`, resource.content)
    if (resource.scripts?.length) {
      for (const script of resource.scripts) {
        zip.file(`${basePath}scripts/${script.name}`, script.content)
      }
    }
    zip.file(`${basePath}README.md`, generateReadme(resource, target))
  } else {
    // Raw - universal format also compatible with .agents/skills/
    const ext = resource.type === 'cursor_rule' ? `${skillName}.mdc` : `${skillName}/SKILL.md`
    zip.file(ext, resource.content)
    if (resource.scripts?.length) {
      for (const script of resource.scripts) {
        zip.file(`${skillName}/scripts/${script.name}`, script.content)
      }
    }
  }

  return await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } })
}

/**
 * Build a thematic pack ZIP with multiple resources.
 * Streams progressively (returns a generator for chunked streaming).
 */
export async function buildPackZip(
  packName: string,
  resources: ResourceData[],
  target: DownloadTarget = 'claude'
): Promise<Uint8Array> {
  const zip = new JSZip()
  const packFolder = zip.folder(packName.toLowerCase().replace(/\s+/g, '-'))!
  
  zip.file('MYSTICFORGE_PACK.md', generatePackManifest(packName, resources, target))

  for (const resource of resources) {
    const skillName = resource.name.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    
    if (target === 'claude') {
      const folder = packFolder.folder(`.claude/skills/${skillName}`)!
      folder.file('SKILL.md', resource.content)
      if (resource.scripts?.length) {
        const scriptsFolder = folder.folder('scripts')!
        for (const s of resource.scripts) {
          scriptsFolder.file(s.name, s.content)
        }
      }
    } else if (target === 'cursor') {
      const mdcContent = resource.type === 'cursor_rule' ? resource.content : convertToMdc(resource)
      packFolder.file(`.cursor/rules/${skillName}.mdc`, mdcContent)
    } else if (target === 'gemini') {
      const folder = packFolder.folder(`.gemini/skills/${skillName}`)!
      folder.file('SKILL.md', resource.content)
    } else {
      packFolder.file(`${skillName}/SKILL.md`, resource.content)
    }
  }

  return await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } })
}

function convertToMdc(resource: ResourceData): string {
  // Extract existing frontmatter or create one
  const frontmatterMatch = resource.content.match(/^---\n([\s\S]*?)\n---\n?/)
  const existingFrontmatter = frontmatterMatch ? frontmatterMatch[1] : ''
  const bodyContent = frontmatterMatch ? resource.content.slice(frontmatterMatch[0].length) : resource.content

  const hasDesc = existingFrontmatter.includes('description:')
  const desc = hasDesc ? '' : `description: ${resource.display_name} - ${(resource as { description?: string }).description || ''}`

  return `---
${existingFrontmatter || desc}
alwaysApply: false
globs: []
---
${bodyContent}`
}

function generateReadme(resource: ResourceData, target: DownloadTarget): string {
  const paths: Record<DownloadTarget, string> = {
    claude: `.claude/skills/${resource.name}/`,
    cursor: `.cursor/rules/${resource.name}.mdc`,
    gemini: `.gemini/skills/${resource.name}/`,
    raw: `./`,
  }
  
  return `# ${resource.display_name}

Downloaded from MysticForge - The #1 AI Skills Hub

## Installation

This ZIP was packaged for **${target}**.
Extract contents to your project root:

\`\`\`
${paths[target]}
\`\`\`

## CLI Install

\`\`\`bash
npx skills add ${resource.slug}
\`\`\`

---
🔮 MysticForge · https://mysticforge.ai
`
}

function generatePackManifest(packName: string, resources: ResourceData[], target: DownloadTarget): string {
  return `# ${packName} - MysticForge Pack

Downloaded: ${new Date().toISOString()}
Resources: ${resources.length}
Target: ${target}

## Included Resources

${resources.map((r, i) => `${i + 1}. **${r.display_name}** (${r.type})`).join('\n')}

---
🔮 MysticForge · https://mysticforge.ai
`
}

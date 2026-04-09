// Security scanner for OWASP Agentic Top 10 (AST10)
// Analyzes SKILL.md, .mdc files, and scripts for threats

export interface SecurityFinding {
  category: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  message: string
  line?: number
  code?: string
}

export interface SecurityReport {
  score: number // 0-100
  severity: 'critical' | 'high' | 'medium' | 'low' | 'clean'
  findings: SecurityFinding[]
  scanned_at: string
}

// OWASP AST10 threat patterns
const THREAT_PATTERNS = [
  // ASI01 - Goal Hijack / Prompt Injection
  {
    category: 'ASI01 - Prompt Injection',
    severity: 'high' as const,
    patterns: [
      /ignore\s+(?:all\s+)?(?:previous|above|prior)\s+instructions/gi,
      /forget\s+(?:all\s+)?(?:your\s+)?(?:previous|prior)\s+(?:instructions|context)/gi,
      /you\s+are\s+now\s+(?:a|an)\s+(?!helpful)/gi,
      /system\s+prompt\s*[:=]/gi,
      /\[INST\].*?\[\/INST\]/gi,
    ]
  },
  // ASI01 - Command Injection
  {
    category: 'ASI01 - Command Injection',
    severity: 'critical' as const,
    patterns: [
      /\$\(.*\)/g,
      /`[^`]*\b(?:curl|wget|bash|sh|exec|eval)\b[^`]*`/gi,
      /;\s*(?:curl|wget|bash|sh|nc|netcat|python|node)\s/gi,
      /\|\s*(?:bash|sh|zsh)\s/gi,
    ]
  },
  // ASI03 - Over-privileged (credential harvesting)
  {
    category: 'ASI03 - Credential Harvesting',
    severity: 'critical' as const, 
    patterns: [
      /cat\s+~\/\.(?:ssh|aws|env|bashrc|profile|zshrc)/gi,
      /\$HOME\/\.(?:ssh|aws|env)/gi,
      /find\s+.*\.env(?:\s|$)/gi,
      /grep\s+-r.*(?:password|secret|token|api.?key)/gi,
      /env\s*\|?\s*grep/gi,
    ]
  },
  // ASI03 - Network exfiltration
  {
    category: 'ASI03 - Data Exfiltration',
    severity: 'critical' as const,
    patterns: [
      /curl\s+.*-d\s+.*\$(?:HOME|USER|PATH|SHELL)/gi,
      /wget\s+.*--post-data/gi,
      /nc\s+(?:-[lvp]*\s+)*\d+\.\d+\.\d+\.\d+/gi,
      /\b(?:reverse|bind)\s+shell\b/gi,
    ]
  },
  // ASI04 - Supply chain
  {
    category: 'ASI04 - Supply Chain',
    severity: 'high' as const,
    patterns: [
      /npm\s+install\s+.*--unsafe-perm/gi,
      /pip\s+install\s+.*(?:--trusted-host|--no-deps)\s+(?!(?:pypi|files)\.pythonhosted)/gi,
      /curl\s+.*\|\s*(?:bash|sh|python|node)/gi,
      /base64\s+-d\s*\|/gi,
    ]
  },
  // ASI05 - Unsafe deserialization
  {
    category: 'ASI05 - Unsafe Deserialization',
    severity: 'high' as const,
    patterns: [
      /eval\s*\(/gi,
      /exec\s*\(/gi,
      /Function\s*\(/gi,
      /\bpickle\.loads?\b/gi,
      /\byaml\.load\s*\(/gi, // should use safe_load
    ]
  },
  // ASI06 - Context poisoning via obfuscated content
  {
    category: 'ASI06 - Obfuscation',
    severity: 'high' as const,
    patterns: [
      /(?:atob|btoa)\s*\(/gi,
      /\\x[0-9a-f]{2}(?:\\x[0-9a-f]{2}){5,}/gi,
      /(?:charCodeAt|fromCharCode)\s*\(/gi,
      /\u202e/g, // RTL override character
    ]
  },
  // Suspicious URLs (malware callback)
  {
    category: 'Suspicious Network Calls',
    severity: 'medium' as const,
    patterns: [
      /https?:\/\/(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?\/[^\s]*/gi,
      /https?:\/\/[a-z0-9\-]+\.(?:ngrok|serveo|localhost\.run|pagekite)/gi,
    ]
  },
  // Malware signatures
  {
    category: 'Malware Signature',
    severity: 'critical' as const,
    patterns: [
      /AMOS|infostealer|stealer|keylogger|rootkit|backdoor/gi,
      /ClawHavoc|ToxicSkill/gi,
    ]
  },
]

function scoreFromFindings(findings: SecurityFinding[]): number {
  if (findings.length === 0) return 100
  let deductions = 0
  for (const f of findings) {
    if (f.severity === 'critical') deductions += 40
    else if (f.severity === 'high') deductions += 20
    else if (f.severity === 'medium') deductions += 10
    else deductions += 5
  }
  return Math.max(0, 100 - deductions)
}

function severityFromScore(score: number, findings: SecurityFinding[]): SecurityReport['severity'] {
  if (findings.some(f => f.severity === 'critical')) return 'critical'
  if (findings.some(f => f.severity === 'high')) return 'high'
  if (score < 70) return 'medium'
  if (score < 90) return 'low'
  return 'clean'
}

export function scanContent(content: string, scripts: Array<{name: string, content: string}> = []): SecurityReport {
  const findings: SecurityFinding[] = []
  const lines = content.split('\n')

  // Scan main content line by line
  for (const [i, line] of lines.entries()) {
    for (const threat of THREAT_PATTERNS) {
      for (const pattern of threat.patterns) {
        pattern.lastIndex = 0
        if (pattern.test(line)) {
          // Don't duplicate
          if (!findings.some(f => f.category === threat.category && f.line === i + 1)) {
            findings.push({
              category: threat.category,
              severity: threat.severity,
              message: `Pattern detected: ${threat.category}`,
              line: i + 1,
              code: line.trim().slice(0, 100),
            })
          }
        }
      }
    }
  }

  // Scan script files
  for (const script of scripts) {
    const scriptLines = script.content.split('\n')
    for (const [i, line] of scriptLines.entries()) {
      for (const threat of THREAT_PATTERNS) {
        for (const pattern of threat.patterns) {
          pattern.lastIndex = 0
          if (pattern.test(line)) {
            if (!findings.some(f => f.category === threat.category && f.code === line.trim().slice(0, 100))) {
              findings.push({
                category: threat.category,
                severity: threat.severity,
                message: `In script ${script.name} - ${threat.category}`,
                line: i + 1,
                code: line.trim().slice(0, 100),
              })
            }
          }
        }
      }
    }
  }

  // Check for binary/executable content
  if (/[\x00-\x08\x0E-\x1F\x7F-\xFF]{3,}/g.test(content)) {
    findings.push({
      category: 'ASI01 - Binary Content',
      severity: 'high',
      message: 'Binary or non-printable characters detected in content',
    })
  }

  const score = scoreFromFindings(findings)
  const severity = severityFromScore(score, findings)

  return {
    score,
    severity,
    findings,
    scanned_at: new Date().toISOString(),
  }
}

export function isQuarantined(report: SecurityReport): boolean {
  return report.severity === 'critical' || report.score < 40
}

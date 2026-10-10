<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Repository-maintenance Agent Skill

For a requested cleanup of **merged GitHub work branches**, read `.agents/skills/github-merged-branch-maintenance/SKILL.md` and its audited companion `scripts/github_cleanup_merged_branches.py`. The script is dry-run only unless the user explicitly authorizes deletion; never store GitHub tokens in source, never delete protected/default branches, and never infer deletion from a PR merge. This skill does not grant new connector permissions or register a skill globally in ChatGPT.

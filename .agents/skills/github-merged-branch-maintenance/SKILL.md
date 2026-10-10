---
name: github-merged-branch-maintenance
description: Audit and safely delete merged non-default GitHub work branches after confirming no unique commits, branch protection, open pull requests and stable refs. Use for GitHub repository housekeeping, bulk merged-branch audits, and cautious cleanup.
---
# GitHub merged-branch maintenance

## Required safety gates
1. Discover the authenticated owner's repositories and their actual default branches. Never infer that `main` is default when it may be `master` or another reference.
2. Discover all branches with pagination. Preserve default/protected branches, structural aliases (`main`, `master`, `termux-android`) and branch patterns not explicitly authorized by the user.
3. For each candidate use GitHub's compare API with base=default, head=candidate. Only status `behind` or `identical` with `ahead_by=0` is safe for deletion of unique remote commits.
4. Immediately before any deletion, reread the branch ref and reject if head SHA, default branch, protection or archive state changed. Reject if any open PR uses the candidate head.
5. Execute deletion only with explicit user approval; dry-run is the default. GitHub's DELETE ref endpoint lacks an expected-SHA lease, so races cannot be completely excluded. Never run concurrently with other pushes, and recheck current state first.
6. Authenticate with the operator's existing `gh auth login` or environment-scoped token. Never store/print tokens, credential helpers or private repository content in commits.
7. Report exact per-repo eligible, skipped and deleted counts, including errors. A successful PR merge is **not** proof the branch was deleted; verify disappearance from the branch endpoint.
8. Avoid GitHub Actions as a workaround for a missing branch-delete connector. Never trigger CI, bypass a denied provider action, or reset a branch to emulate deletion.

## Execution
- Use the audited companion: `scripts/github_cleanup_merged_branches.py`.
- Dry run: `python scripts/github_cleanup_merged_branches.py --owner OWNER`
- One-branch deletion: `python scripts/github_cleanup_merged_branches.py --owner OWNER --repo REPO --branch codex/NAME --apply --confirm-delete-merged`
- Batch deletion: `python scripts/github_cleanup_merged_branches.py --owner OWNER --apply --confirm-delete-merged`
- Always inspect the dry-run result and confirm the requested pattern scope matches the user's explicit authorization before using batch mode.
- When APIs cannot delete branches because no authenticated permitted action is available, mark cleanup BLOCKED. Do not claim deletion or write an artificial Git history state.

## Not a ChatGPT-installed plugin
This is a repository-local Agent Skill intended for coding agents. Committing SKILL.md does not register a globally installed ChatGPT Plugin or provide new GitHub API permissions.

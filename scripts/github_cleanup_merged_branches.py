#!/usr/bin/env python3
"""Safely audit or delete merged GitHub work branches. DRY RUN by default.

Authenticate with gh auth login (GitHub CLI) or GH_TOKEN/GITHUB_TOKEN in the
operator's environment. No credentials are saved or printed by this script.
Deletes only codex/*, agent/*, fix/* or node24-lock-bootstrap with explicit
--apply --confirm-delete-merged and a fresh zero-ahead comparison. Deleting a
remote ref is not atomic with the comparison: avoid concurrent branch pushes.
"""
from __future__ import annotations
import argparse
import json
import os
import shutil
import subprocess
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

API = "https://api.github.com"
PREFIXES = ("codex/", "agent/", "fix/")
EXACT = {"node24-lock-bootstrap"}
PROTECTED_NAMES = {"main", "master", "termux-android"}

class GitHubError(Exception):
    pass

def token_from_environment():
    token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
    if token:
        return token
    if not shutil.which("gh"):
        return None
    try:
        p = subprocess.run(["gh", "auth", "token"], capture_output=True, text=True, timeout=8)
        return p.stdout.strip() if p.returncode == 0 and p.stdout.strip() else None
    except (OSError, subprocess.TimeoutExpired):
        return None

def api(method, path, token, status=200):
    req = Request(API + path, method=method, headers={
        "Authorization": "Bearer " + token,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "merged-branch-audit/1.1",
    })
    try:
        with urlopen(req, timeout=25) as response:
            raw, actual = response.read(), response.status
    except HTTPError as exc:
        raise GitHubError(f"{method} {path}: GitHub HTTP {exc.code}") from None
    except URLError as exc:
        raise GitHubError(f"{method} {path}: network error {type(exc.reason).__name__}") from None
    if actual != status:
        raise GitHubError(f"{method} {path}: expected {status}, got {actual}")
    return json.loads(raw) if raw else None

def pages(path, token):
    for page in range(1, 51):
        sep = "&" if "?" in path else "?"
        data = api("GET", f"{path}{sep}per_page=100&page={page}", token)
        if not isinstance(data, list):
            raise GitHubError(f"Invalid paged list for {path}")
        yield from data
        if len(data) < 100:
            return
    raise GitHubError(f"Pagination ceiling reached: {path}")

def eligible_name(name, default):
    return (name != default and name not in PROTECTED_NAMES and
            (name.startswith(PREFIXES) or name in EXACT))

def snapshot(owner, repo, branch, default, token):
    name = branch.get("name", "")
    if branch.get("protected") or not eligible_name(name, default):
        return None
    sha = branch.get("commit", {}).get("sha")
    if not sha:
        return None
    comparison = api("GET", f"/repos/{quote(owner)}/{quote(repo)}/compare/{quote(default, safe='')}...{quote(name, safe='')}", token)
    if comparison.get("ahead_by") != 0 or comparison.get("status") not in {"behind", "identical"}:
        return None
    return {"owner": owner, "repo": repo, "default": default, "branch": name, "sha": sha}

def delete_candidate(item, token):
    owner, repo = item["owner"], item["repo"]
    prefix = f"/repos/{quote(owner)}/{quote(repo)}"
    meta = api("GET", prefix, token)
    if meta.get("archived") or meta.get("default_branch") != item["default"]:
        raise GitHubError("Repository archived or default branch changed")
    current = next((b for b in pages(prefix + "/branches", token)
                    if b.get("name") == item["branch"]), None)
    if current is None or current.get("protected") or current.get("commit", {}).get("sha") != item["sha"]:
        raise GitHubError("Branch disappeared, moved or became protected")
    if snapshot(owner, repo, current, item["default"], token) is None:
        raise GitHubError("Unique commits, no valid comparison or changed protection")
    params = urlencode({"state": "open", "head": f"{owner}:{item['branch']}"})
    prs = list(pages(prefix + "/pulls?" + params, token))
    if prs:
        raise GitHubError("Open PR still references this branch")
    ref = quote("heads/" + item["branch"], safe="/")
    api("DELETE", prefix + "/git/refs/" + ref, token, status=204)
    # Verify remotely rather than claim deletion from the DELETE response alone.
    remainder = (b for b in pages(prefix + "/branches", token)
                 if b.get("name") == item["branch"])
    if next(remainder, None) is not None:
        raise GitHubError("Deletion request returned 204 but branch still exists")
    return True

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--owner", required=True)
    parser.add_argument("--repo")
    parser.add_argument("--branch")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--confirm-delete-merged", action="store_true")
    args = parser.parse_args()
    if args.branch and not args.repo:
        parser.error("--branch requires --repo")
    if args.apply and not args.confirm_delete_merged:
        parser.error("--apply requires --confirm-delete-merged")
    token = token_from_environment()
    if not token:
        print("BLOCKED: no authorized GitHub credentials; no changes made", file=sys.stderr)
        return 2
    try:
        if args.repo:
            names = [args.repo]
        else:
            names = [r["name"] for r in pages("/user/repos?affiliation=owner", token)
                     if r.get("owner", {}).get("login", "").casefold() == args.owner.casefold()
                     and not r.get("archived")]
        matches, scanned = [], 0
        for repo in names:
            meta = api("GET", f"/repos/{quote(args.owner)}/{quote(repo)}", token)
            if meta.get("archived"):
                continue
            default = meta.get("default_branch")
            if not default:
                continue
            for branch in pages(f"/repos/{quote(args.owner)}/{quote(repo)}/branches", token):
                scanned += 1
                if args.branch and branch.get("name") != args.branch:
                    continue
                info = snapshot(args.owner, repo, branch, default, token)
                if info:
                    matches.append(info)
                    print(f"ELIGIBLE {repo}/{info['branch']} sha={info['sha'][:12]} default={default}")
        print(f"SUMMARY repos={len(names)} branches_scanned={scanned} eligible={len(matches)} dry_run={not args.apply}")
        if not args.apply:
            print("DRY RUN: no branches deleted")
            return 0
        deleted, errors = 0, 0
        for item in matches:
            try:
                delete_candidate(item, token)
                print(f"VERIFIED_DELETED {item['repo']}/{item['branch']}")
                deleted += 1
            except GitHubError as exc:
                print(f"BLOCKED {item['repo']}/{item['branch']}: {exc}", file=sys.stderr)
                errors += 1
        print(f"RESULT deleted={deleted} blocked={errors}")
        return 1 if errors else 0
    except GitHubError as exc:
        print(f"STOP: {exc}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(main())

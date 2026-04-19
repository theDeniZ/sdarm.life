# Git Flow — Strict Rules

⚠️ **This is the law.** These rules are non-negotiable for maintaining a clean, linear history.

---

## The Three Branches

| Branch | Purpose | Protection |
|---|---|---|
| `main` | **Production only.** Deployed code. | 🔒 Never touch directly. Merged PRs only. |
| `develop` | Integration branch for next release. | Merge from feature branches via fast-forward. |
| `feat/*` | Your work. One feature per branch. | Rebase onto `develop` before PR. |

---

## ⚠️ Sacred Rules (never break these)

### 1. **NEVER commit directly to `main`**

No exceptions. Not for hotfixes, not for "quick" typos, not for "just this once."

```bash
# ❌ DO NOT DO THIS
git checkout main
git commit -m "..."
git push origin main

# ✅ DO THIS
git checkout -b fix/typo develop
git commit -m "..."
git push origin fix/typo
# Open a PR from fix/typo → develop
```

### 2. **NEVER commit directly to `develop`**

Use a feature branch. The only exception is a bot or automated process (e.g., dependency updates).

```bash
# ❌ DO NOT DO THIS
git checkout develop
git commit -m "..."
git push origin develop

# ✅ DO THIS
git checkout -b feat/new-feature develop
git commit -m "..."
git push origin feat/new-feature
# Open a PR
```

### 3. **ONE commit per PR, ALWAYS**

Every feature branch must contain exactly one commit when it lands in `develop`. No exceptions.

If you've made multiple commits on your feature branch, **rebase interactively** before opening the PR.

```bash
# You've made 3 commits on feat/my-feature
git log --oneline
# abc1234 fix typo in component
# def5678 add prop to component
# ghi9012 add new feature

# Rebase onto develop, squashing into one commit
git rebase -i develop

# Editor opens. Keep the first commit, squash the rest:
# pick ghi9012 add new feature
# squash def5678 add prop to component
# squash abc1234 fix typo in component

git push origin feat/my-feature --force-with-lease
```

### 4. **Rebase before opening PR**

Ensure your branch is up-to-date with `develop` and is a linear descendant. No merge commits.

```bash
# Before opening the PR
git rebase develop

# If there are conflicts, resolve them
git add .
git rebase --continue

# Force-push to your feature branch (safe because it's your branch)
git push origin feat/my-feature --force-with-lease
```

### 5. **Fast-forward merge only**

When merging a PR into `develop`, **always use fast-forward merge.** The GitHub UI defaults to "Create a merge commit" — **change it to "Rebase and merge"** if available, or ensure the branch is already rebased.

```bash
# ✅ After rebase, the history is linear
git log develop..feat/my-feature
# abc1234 add new feature

# When merging, use fast-forward
git checkout develop
git merge --ff-only feat/my-feature
```

GitHub UI: click "Squash and merge" or "Rebase and merge" — both result in a linear history.

### 6. **NO force-pushes after PR is opened**

Once a PR is on remote, **do not force-push** to it unless explicitly updating via code review feedback.

If you need to update the commit message or squash more commits, do it **before** opening the PR.

### 7. **NO `--no-verify` flag**

If a pre-commit hook fails, **fix the underlying issue**, do not skip the hook.

```bash
# ❌ DO NOT DO THIS
git commit --no-verify -m "..."

# ✅ DO THIS
# Fix the linting error, then commit normally
pnpm lint --fix
git add .
git commit -m "..."
```

---

## Workflow: From start to finish

### Step 1: Create your feature branch

```bash
git checkout develop
git pull origin develop
git checkout -b feat/your-feature
```

### Step 2: Commit your work

Make as many commits as you need **locally**. You will squash them later.

```bash
git add src/component.tsx
git commit -m "work in progress: add component logic"

git add src/styles.css
git commit -m "add styles"

# More work...
```

### Step 3: Before opening a PR — Rebase and squash

```bash
# Ensure you're up-to-date with develop
git fetch origin
git rebase origin/develop

# Interactive rebase to squash all commits into one
git rebase -i origin/develop

# Editor opens. Keep the first commit, squash the rest:
# pick abc1234 work in progress: add component logic
# squash def5678 add styles
# (more squashes...)

# The editor opens again. Clean up the commit message:
# Add descriptive title and body
```

### Step 4: Push to remote and open PR

```bash
git push origin feat/your-feature

# Open a PR on GitHub: feat/your-feature → develop
# Add description, link any issues
```

### Step 5: PR review and merge

- Code review feedback? Make changes locally (new commits are fine now), then repeat Step 3 (rebase + squash).
- Approved? **Merge via GitHub UI** — use "Rebase and merge" or "Squash and merge" to maintain linear history.

### Step 6: Clean up

```bash
git checkout develop
git pull origin develop
git branch -d feat/your-feature  # Delete locally
git push origin --delete feat/your-feature  # Delete remote
```

---

## Common scenarios

### Scenario: You have 5 commits, need to squash before opening PR

```bash
git rebase -i origin/develop
# In editor:
# pick    abc1234 first commit (keep)
# squash  def5678 second commit
# squash  ghi9012 third commit
# squash  jkl3456 fourth commit
# squash  mno7890 fifth commit

# Edit the final commit message
git push origin feat/your-feature --force-with-lease
```

### Scenario: `develop` moved ahead while you were working

```bash
# Fetch latest develop
git fetch origin

# Rebase your work onto the new develop
git rebase origin/develop

# Resolve conflicts if any
git add .
git rebase --continue

# Force-push (safe, it's your branch)
git push origin feat/your-feature --force-with-lease
```

### Scenario: You amended a commit that's already on remote

```bash
# ❌ Do NOT use git push -f
# ✅ Use --force-with-lease (safer, fails if remote changed)
git push origin feat/your-feature --force-with-lease
```

### Scenario: PR is approved but has conflicts

```bash
# Rebase onto current develop
git rebase origin/develop
# Resolve conflicts
git add .
git rebase --continue
git push origin feat/your-feature --force-with-lease
# Go back to GitHub, re-request review
```

---

## Commit message format

Keep it concise and descriptive. The single commit message is the narrative of your change.

```
Brief imperative title (≤50 chars)

Longer explanation if needed (wrap at 72 chars):
- What changed
- Why it changed
- Any gotchas or notes

Closes #123  (if applicable)
```

Example:
```
Add song content search in songbook

Extend songbook search to query song lyrics in addition to title
and number. Matches on any word boundary in the lyrics. Results
highlight matching content in addition to matching title.

User can now find a song by lyrics without knowing the title.

Closes #3
```

---

## Troubleshooting

**Q: I already pushed 5 commits to my PR branch. Can I squash now?**

A: Yes. Rebase interactively, squash, then force-push with `--force-with-lease`. This is fine before PR is approved.

**Q: Can I commit directly to `develop` for a small fix?**

A: **No.** Always use a feature branch, even for typos. The rule is absolute.

**Q: What if `main` is out of sync with `develop`?**

A: It shouldn't be. `develop` is the source of truth; `main` receives merges from `develop` only. If this happens, investigate.

**Q: Can I use `git push -f`?**

A: Avoid it. Use `--force-with-lease` instead — it's safer and fails if the remote changed unexpectedly.

**Q: I'm on a feature branch and someone pushed to `develop`. Do I need to rebase?**

A: Only if your PR is open and you want to update it. Otherwise, you can rebase just before opening the PR. Rebasing early is fine; rebasing after a PR is open should be rare.

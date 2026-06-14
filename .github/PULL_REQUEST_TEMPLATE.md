## What does this PR do?

<!-- One sentence. What changed and why. -->

Closes #<!-- issue number -->

---

## Creator checklist

Complete every item before marking the PR as ready for review.

### Code & correctness

- [ ] The feature/fix works end-to-end locally — I ran the affected app(s) and verified the golden path
- [ ] I tested edge cases and error states (empty state, 404, validation errors, etc.)
- [ ] No `console.log`, `TODO`, or `FIXME` left in the diff
- [ ] No secrets, API keys, or `.env` values committed

### Git hygiene

- [ ] Branch is rebased onto `develop` — no merge commits (`git rebase origin/develop`)
- [ ] **Exactly one commit** on this branch — interactive rebase done if needed (`git rebase -i origin/develop`)
- [ ] Commit message follows the format in `docs/gitflow.md` (imperative title ≤50 chars, body if needed)

### Documentation

- [ ] `docs/api.md` updated (if any route was added, changed, or removed)
- [ ] `docs/schema.md` updated (if DB schema or config keys changed)
- [ ] `docs/frontend.md` updated (if any component was added, changed, or removed)
- [ ] `docs/conventions.md` / `docs/architecture.md` updated (if a pattern or package boundary changed)
- [ ] i18n keys added to **both** `de.json` and `en.json` (if new user-facing strings)

### Responsive & visual (frontend changes only)

- [ ] Verified at 1280px, 1024px, 768px, 375px using DevTools
- [ ] Verified in both dark and light theme
- [ ] New screenshot test added if needed
- [ ] Screenshot test baselines updated if needed (`pnpm test:screenshots:update`)

---

## Reviewer checklist

Complete every item before approving.

### Understand the change

- [ ] I read the linked issue — the PR scope matches what was requested (no unrelated changes)
- [ ] The PR description clearly explains what changed and why

### Code quality

- [ ] Logic is correct and handles edge cases
- [ ] No premature abstractions — three similar lines is fine; a helper is justified only when needed in two or more places
- [ ] Types are narrow — no `any`, no `Record<string, unknown>` where a real interface fits
- [ ] No cross-app imports; shared code lives in `packages/` only
- [ ] No DSGVO violations — no third-party fetches from the browser, no hotlinked assets, no new trackers (see `docs/dsgvo.md`)

### Documentation accuracy

- [ ] Docs changes (if any) accurately describe what shipped — I can spot an inaccuracy if it exists

### Manual verification

- [ ] I pulled the branch and ran the affected app(s) locally
- [ ] I verified the stated behaviour works
- [ ] I spot-checked at least one edge case or error state

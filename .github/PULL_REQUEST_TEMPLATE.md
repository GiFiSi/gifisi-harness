## What changed

<!-- One or two sentences. -->

## Why

<!-- The problem this solves. -->

## Checks

- [ ] `node scripts/validate-harness.mjs` exits 0
- [ ] `node scripts/check-install.mjs` exits 0 (when the installer or templates changed)
- [ ] `node scripts/sync-harnesses.mjs --repo` leaves no diff (when `core/harness/` changed)
- [ ] Source files stay under 350 lines

# S5-FE-A-05 — Move stray `*.txt` completion reports out of repo root

**Owner:** TL-FE
**Branch:** `chore/S5-FE-A-05-cleanup-reports`
**Estimated:** 0.1 day
**Blocks:** —
**Blocked by:** —

## Goal

After the latest merge, several `FE-A-06-*.txt`, `FE-B-01-*.txt`, `S0-FE-A-02-*.txt`, etc. completion reports sit at repo root. Keep them but stop polluting the root.

## Steps

1. `mkdir docs/reports/`
2. Move every `*-complete.txt` / `*-completion-report.txt` / `*-summary.txt` from repo root into `docs/reports/`.
3. Add `*.txt` at the repo root to `.gitignore` (or specifically the patterns we keep seeing).
4. Update the team norm: completion reports go under `docs/reports/`, not root.

## Acceptance criteria

- [ ] Repo root has no completion-report `.txt` files
- [ ] `docs/reports/` lists them
- [ ] `.gitignore` updated so future ones aren't committed by accident

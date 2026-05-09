# Contributing — RELMS Intern Workflow

This document is the source of truth for **how interns work on this project**. Read it once on day 1 and revisit whenever something is unclear.

---

## 0. Important context — static UI is provided

**The website and admin panel UI is being delivered by the manager as a static React build.** The frontend team is **not designing pages from scratch.** Your job is to take the static UI and **make it dynamic** by:

- Replacing hardcoded mock data with real API calls
- Wiring forms to backend endpoints
- Adding loading / empty / error states
- Adding role-based gating
- Adding routing logic where needed

When a task file says "build the Leads page", read it as "wire the Leads page that already exists in the static UI to the backend." If the static UI for a page hasn't been delivered yet, build the data layer (hook + API client functions) and stub the UI, then swap when the design lands. **Don't redesign anything.** If a layout looks wrong, raise it with the manager — don't fix it on your own branch.

The backend team builds APIs that match what the static UI expects (field names, response shapes). When in doubt, the static UI is the contract — match it.

---

## 1. Team & ownership

| Intern slot | Owns |
|---|---|
| **BE-A** (DB + Auth + Company) | `backend/prisma/schema.prisma`, migrations, seeds, `backend/src/modules/{auth,company,user}/`, `backend/src/lib/tenantPrisma.js`, env/logger/error infra |
| **BE-B** (Lead + Pipeline) | `backend/src/modules/{project,lead,pipeline,activity,task,note}/`, lead dedup, CSV import |
| **FE-A** (Shell + Auth + Onboarding + Dashboard) | `frontend/src/App.jsx` (routes), `frontend/src/lib/api.js`, `frontend/src/stores/`, `frontend/src/pages/auth/`, `frontend/src/pages/onboarding/`, `frontend/src/layouts/`, `frontend/src/components/common/Sidebar.jsx`, dashboard wiring |
| **FE-B** (Lead + Project UI wiring) | `frontend/src/pages/admin/{Leads,Projects,Team}.jsx`, lead detail, Kanban board, lead/project forms — wiring static UI to APIs |

When the 5th BE intern returns, BE-A hands `prisma/schema.prisma`, migrations, and seeds to them.

### Single-owner files (DO NOT edit outside your role)

| File | Owner |
|---|---|
| `backend/prisma/schema.prisma` | BE-A only — request schema changes via Slack/PR comment |
| `frontend/src/App.jsx` (routes) | FE-A only — request new routes |
| `frontend/src/components/common/Sidebar.jsx` | FE-A only — request new menu items |
| `frontend/src/lib/api.js` | FE-A only — new endpoints go through FE-A's helper pattern |
| `frontend/src/stores/authStore.js` | FE-A only |

If you need a change in one of those files and the owner hasn't merged it yet, post in the team channel with the task ID. **Don't fork the file.**

---

## 2. Project conventions

### Backend

- **Folder pattern:** `backend/src/modules/<feature>/{<feature>.routes.js, <feature>.controller.js, <feature>.service.js, <feature>.validation.js}`. No top-level `controllers/`, `routes/` (per-feature), or `validations/` folders — those are deleted in S0.
- **Tenant isolation:** every service function takes `companyId` as a required parameter. Use `getTenantPrisma(companyId)` (built in S0-BE-A-03) for all DB access. Never call `prisma.lead.findMany()` directly without a `companyId` filter.
- **Auth:** `better-auth` is the only auth system. Do not write custom JWT/cookie code. Do not store plaintext passwords.
- **Validation:** every route validates input with `zod` via the module's `*.validation.js`.
- **Errors:** throw typed errors (`ApiError(status, message)`); the global error middleware formats the response. Don't `res.status(500).json(...)` from controllers.
- **Logging:** use the logger from `backend/src/lib/logger.js`. No `console.log` in committed code.
- **Response shape:** `{ ok: true, data }` on success, `{ ok: false, error: { code, message, details? } }` on error. The static UI expects this shape.

### Frontend (wiring, not designing)

- **Folder pattern:** `pages/` for routed pages, `components/<feature>/` for feature components, `components/ui/` is shadcn (don't hand-edit), `components/common/` for shared layout pieces.
- **Forms:** `react-hook-form` + `zod` resolver. No raw `useState` form chains.
- **State:** server state via custom hooks (e.g. `useLeads`); UI/auth state via `zustand`. Don't use Redux.
- **API calls:** import from `lib/api.js`. Never call `axios` directly from a component.
- **Don't restyle the static UI.** Add classes only where wiring requires them (e.g., `disabled` button states, conditional rendering). Layout, colors, spacing — leave alone.
- **Icons:** `lucide-react` (already in static UI).

### Both

- **Branch naming:** `<role>/<module>/<task-id>-<slug>` — e.g. `be/lead/S2-BE-B-01-lead-crud`, `fe/auth/S0-FE-A-01-api-client`.
- **PR title:** `[TASK-ID] Short description` — e.g. `[S2-BE-B-01] Lead CRUD endpoints`.
- **Commit messages:** present-tense verb first — `add lead create endpoint`, `fix dedup case sensitivity`. Don't commit "WIP" messages on PRs.
- **One task = one branch = one PR.** No drive-by changes. If you find a bug in someone else's code, file it in the team channel.

---

## 3. Step-by-step git & PR workflow

This is the exact sequence for every single task. Follow it without skipping steps. Commands are PowerShell (Windows) — same on Mac/Linux except where noted.

### Day 1, one-time setup

```powershell
# Clone the repo (if you haven't)
git clone https://github.com/<org>/real-estate-lead-management.git
cd real-estate-lead-management

# Configure git with your name/email
git config user.name "Your Full Name"
git config user.email "you@example.com"

# Install dependencies
cd backend; npm install; cd ..
cd frontend; npm install; cd ..

# Copy env templates
copy backend\.env.example backend\.env       # PowerShell
copy frontend\.env.example frontend\.env

# Edit .env files with the values your manager shared (DATABASE_URL, BETTER_AUTH_SECRET, etc.)

# Verify both apps run
cd backend; npm run dev    # terminal 1
cd frontend; npm run dev   # terminal 2 — opens http://localhost:5173
```

### Step 1 — Sync your local main with the latest changes

Do this **before every task**, not just once a day. Other interns merge frequently.

```powershell
# Make sure you're on main
git checkout main

# Fetch and pull the latest from origin
git pull origin main

# If you were mid-task on another branch, stash first:
# git stash push -m "wip on previous task"
# git checkout main
# git pull origin main
# git checkout <other-branch>
# git stash pop
```

If `git pull` shows merge conflicts on main, **stop and ask the manager** — main should never have conflicts. You probably committed directly to main by mistake.

### Step 2 — Brief your AI tool on what's new since last time

After every pull, ask your AI to summarize the changes so you don't write code that conflicts with someone else's recent merge.

**For Claude Code:**
> Read the output of `git log --oneline -20` and the diffs of the last 5 commits. Summarize what changed in the codebase since I last synced. Highlight any changes that affect [my module / the task I'm about to start: <TASK-ID>].

**For OpenCode (Big-Pickle):**
Same prompt — paste it in the chat box.

**For VS Code + ChatGPT:**
Run `git log --oneline -20` in your terminal, copy the output into the chat, and paste:
> Here's the recent commit history. Read the files that changed and summarize what's new. I'm about to work on task <TASK-ID> — flag anything that affects me.

### Step 3 — Open and read your task spec

Open `docs/tasks/sprint-X-name/<TASK-ID>.md` and read it end-to-end. Look at:
- The "Files to read first" section — actually read those files
- The "Acceptance criteria" — that's your definition of done
- The "AI prompt template" — copy-paste it to your AI to start

### Step 4 — Create your task branch

```powershell
# From main (you should already be there from step 1)
git status                     # confirm "On branch main, nothing to commit"

# Create and switch to your task branch
git checkout -b be/lead/S2-BE-B-01-lead-crud
#                ^^  ^^^^^ ^^^^^^^^^^^^^^^^^^^
#                role module task-id-and-short-slug
```

Branch naming examples:
| Role | Example |
|---|---|
| BE-A on auth | `be/auth/S0-BE-A-02-better-auth` |
| BE-B on lead | `be/lead/S2-BE-B-01-lead-crud` |
| FE-A on shell | `fe/foundation/S0-FE-A-02-shell` |
| FE-B on Kanban | `fe/pipeline/S3-FE-B-02-kanban` |

### Step 5 — Implement the task

Follow your task spec. Use your AI tool. Run the app and test as you go.

```powershell
# As you make changes, periodically commit
git add <specific-files>       # prefer naming files; avoid `git add .`
git commit -m "add lead create endpoint and zod schema"

# Commit often — small commits are easier to review and revert
git commit -m "wire lead create to /api/leads"
git commit -m "handle 409 duplicate response"
```

**Avoid:**
- `git add .` — accidentally stages unrelated files (.env edits, node_modules touch-ups). Stage by name.
- `git commit -am "WIP"` — vague messages that don't help the reviewer.
- Committing `node_modules`, `.env`, dist builds — `.gitignore` should catch these but verify with `git status`.

### Step 6 — Run lint / build / verify before pushing

```powershell
# Backend
cd backend
npm run dev    # confirm it starts without errors, then Ctrl+C
# (we don't have automated tests yet — manual smoke test the endpoints)

# Frontend
cd frontend
npm run lint   # fix any errors
npm run build  # must succeed
npm run dev    # manually click through your feature
```

Tick off every item in your task's "Acceptance criteria" before pushing.

### Step 7 — Push your branch

```powershell
# First push of a new branch needs -u to set upstream
git push -u origin be/lead/S2-BE-B-01-lead-crud

# Subsequent pushes (after review feedback)
git push
```

### Step 8 — Open a Pull Request

Go to the GitHub repo in your browser. GitHub will show a banner: "Compare & pull request" — click it.

**PR title:**
```
[S2-BE-B-01] Lead CRUD endpoints
```

**PR description template** (copy this into every PR):
```markdown
## Task
Closes task: [docs/tasks/sprint-2-leads/S2-BE-B-01-lead-crud.md](../docs/tasks/sprint-2-leads/S2-BE-B-01-lead-crud.md)

## What changed
- Added `backend/src/modules/lead/` with routes, controller, service, validation
- Wired into `backend/src/routes/index.js`
- Added zod schemas for create/update/list

## How I tested
- `curl -X POST http://localhost:4000/api/leads ...` — returns 201
- Tried with bad phone format → 400 with field error
- Logged in as AGENT → list only returned own leads

## Notes for reviewer
- TODO: status is still a string; coordinating with BE-A on FK migration
- Do not merge until S0-BE-A-04 lands (depends on Lead schema additions)

## Acceptance checklist
- [x] All endpoints implemented
- [x] AGENT scoping enforced
- [x] PATCH rejects status field
- [x] curl examples added to AUTH.md
```

Click "Create pull request". **Tag the manager as reviewer.**

### Step 9 — Address review feedback

The manager will leave comments. For each:

```powershell
# You're already on your task branch
# Make the requested changes
git add <files>
git commit -m "address review: rename foo to bar"
git push    # PR auto-updates
```

**Do not force-push** unless explicitly asked. Don't rebase merged commits.

### Step 10 — After your PR is merged

```powershell
# Switch back to main
git checkout main

# Pull the latest (which now includes your merged PR)
git pull origin main

# Delete your local branch
git branch -d be/lead/S2-BE-B-01-lead-crud

# Delete the remote branch (GitHub usually does this automatically; verify)
# git push origin --delete be/lead/S2-BE-B-01-lead-crud   # only if needed

# Brief your AI on the new state of main
# (use the prompt from Step 2)

# Pick your next task and go to Step 1
```

---

## 4. Handling common situations

### "Someone else's PR conflicts with mine"

```powershell
# On your task branch
git fetch origin
git merge origin/main          # bring main's changes into your branch
# Resolve conflicts in editor; for each conflicted file:
git add <file>
git commit -m "merge main into branch, resolve conflicts"
git push
```

If conflicts are gnarly, ask the manager before resolving — sometimes the right answer is to redo your work on top of fresh main.

### "I committed to the wrong branch (e.g. main)"

Stop pushing. Tell the manager immediately. They'll guide a fix using `git reset` and `git cherry-pick`.

### "I need to throw away local changes"

```powershell
# Discard unstaged changes in tracked files
git checkout -- .

# Discard ALL changes including new untracked files (DESTRUCTIVE — confirm with manager)
git reset --hard HEAD
git clean -fd
```

### "I need to pause this task and switch to another"

```powershell
git stash push -m "halfway through dedup logic"
git checkout main
git pull
git checkout -b <new-branch>
# ...do other task, push, PR...
# When ready to resume:
git checkout <original-branch>
git stash pop
```

### "I'm blocked on another intern's PR that hasn't merged"

- Check Slack for the status
- If urgent, comment on their PR asking when they expect to land
- Don't start your task on top of their unmerged branch — pick a different task that doesn't depend on it

---

## 5. AI tool guidance per intern

All three tools work fine. The task files include a generic AI prompt that works for any of them.

- **Claude Code (CLI in this repo):** run `claude` in the repo root. The agent reads files via tools — paste the AI prompt and it'll explore. Use `/clear` between tasks to keep context clean.
- **OpenCode (Big-Pickle model):** open the repo in the OpenCode UI. Paste the AI prompt; let it read files before writing. Stage hunks with intent.
- **VS Code + ChatGPT:** ChatGPT can't read your files directly. Copy the relevant files (named in each task's "Files to read first" section) into the chat, then paste the AI prompt.

**One rule for everyone:** never let the AI edit files outside your ownership column without flagging it in the PR. If the AI proposes edits to `schema.prisma` or `App.jsx` and that's not your file, decline and request the change from the owner instead.

---

## 6. Definition of done (every task)

A task is **done** when:

- [ ] All acceptance criteria in the task spec pass
- [ ] Code follows the conventions in section 2
- [ ] No new ESLint errors (frontend) / no console errors (backend startup)
- [ ] PR opened with task ID in title and the description template filled in
- [ ] You manually verified the feature in the running app (start backend with `npm run dev` from `backend/`, frontend with `npm run dev` from `frontend/`)
- [ ] Manager merged your PR
- [ ] You pulled main and cleaned up your local branch

If you can't finish in one day, push WIP to your branch but don't open the PR until it meets the bar above.

---

## 7. Quick reference — every command in one place

```powershell
# Start of every task
git checkout main
git pull origin main
git checkout -b <role>/<module>/<TASK-ID>-<slug>

# During the task
git status
git add <files>
git commit -m "concise present-tense message"

# Push and open PR
git push -u origin <branch>      # first push only
git push                          # subsequent

# After PR merged
git checkout main
git pull origin main
git branch -d <branch>

# Stash to context-switch
git stash push -m "what I was doing"
git stash pop                     # when resuming

# Sync your branch with main mid-task
git fetch origin
git merge origin/main
```

That's it. When in doubt, ask in the team channel before running anything destructive.

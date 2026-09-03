@AGENTS.md

## Sprint log

This repo keeps a running sprint work log under `docs/sprints/`. Every session working in this repo should follow these rules automatically, without being asked.

### Sprint calendar

- Sprints run two weeks. Each starts on a Monday and ends on the Thursday of the following week. That Thursday is the report deadline, around 5pm.
- Current sprint: 2026-08-24 to 2026-09-03. Next: 2026-09-07 to 2026-09-17. Add 14 days for each one after that.
- Work done on the Friday right after a deadline goes into the *next* sprint file, not the one that just closed.

### File format

- One file per sprint, named after the deadline date: `docs/sprints/sprint-2026-09-03.md`.
- Template for a new sprint file:

  ```
  # Sprint <start> to <deadline>
  Project: <project name>
  Deadline: Thursday <deadline>, 5:00pm

  ## Entries

  ## Decisions
  ```

- `## Entries` is grouped by date (`### YYYY-MM-DD` subheadings), each with one-line bullets: `- <summary>. (<short commit hash>)` — the commit hash is only included when the entry corresponds to a commit just made.
- `## Decisions` holds notable technical/architectural decisions, dated: `- YYYY-MM-DD: <decision and the reason for it>`.

### Auto-append rules

- Before writing, work out today's date and pick the correct sprint file per the calendar above. Create it from the template if it doesn't exist yet.
- After completing a meaningful chunk of work in this repo (a fix, a feature, a config/infra change, a notable decision), append an entry to the current sprint file's `## Entries` — don't wait for the user to ask, and don't ask permission first, the same way you wouldn't ask before saving a file you were told to save.
- Keep entries terse — one line, past tense, what changed. Skip trivial or purely exploratory steps (reading files, answering questions) that didn't change repo state.
- The `/log` command (`.claude/commands/log.md`) performs this same append manually on request.

## Branch workflow

Every session working in this repo should follow this automatically, without being asked.

- Work happens on a personal feature branch per sprint, not directly on `main` or `staging`. Never commit, push, or merge to `main` or `staging` directly — that's the team lead's call.
- Branch naming: `eng-<name>-<short-feature-desc>` (all-hyphenated, e.g. `eng-slami-ceo-ui-update`). If no branch name has been given for the current chunk of work, ask the user for one before creating it — don't invent the `<name>` or `<feature-desc>` unprompted.
- At the start of a sprint's work (or when picking up on an existing repo with uncommitted changes and no feature branch yet), create the branch from the current `main`/`staging` as appropriate, then commit and push to `origin` under that branch name.
- The team lead merges the branch into `main` when they're ready — that step is theirs, not something to do automatically or offer to do.

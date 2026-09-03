---
description: Append a work-log entry to the current sprint file
---

Log recent work into this repo's sprint work log at `docs/sprints/`.

## Sprint calendar

- Sprints run two weeks. Each starts on a Monday and ends on the Thursday of the following week. That Thursday is the report deadline, around 5pm.
- Current sprint: 2026-08-24 to 2026-09-03. Next: 2026-09-07 to 2026-09-17. Add 14 days for each one after that.
- One file per sprint, named after the deadline date: `docs/sprints/sprint-2026-09-03.md`.
- Work done on the Friday right after a deadline goes into the *next* sprint file.

## Steps

1. Work out today's date and, from the calendar above, the deadline date of the sprint it falls in. That gives the target file: `docs/sprints/sprint-<deadline>.md`.
2. If that file doesn't exist yet, create it from this template:

   ```
   # Sprint <start> to <deadline>
   Project: <project name>
   Deadline: Thursday <deadline>, 5:00pm

   ## Entries

   ## Decisions
   ```

3. Under `## Entries`, find or create a `### <today's date>` subheading (most recent date last), and append a one-line bullet summarizing the work: `- <summary>. (<short commit hash>)` — include the commit hash only if the work was just committed; omit the parenthetical otherwise.
   - If `$ARGUMENTS` was given, use it as the summary (tightened to one line if needed).
   - Otherwise, summarize the meaningful work done so far in this session that hasn't been logged yet — check the existing entries in this sprint file first so you don't repeat something already logged.
4. If the work included a notable technical or architectural decision (a real tradeoff, not a routine fix), also append a bullet under `## Decisions`: `- <date>: <decision and the reason for it>`.
5. Report back which file and entry you wrote, in one line.

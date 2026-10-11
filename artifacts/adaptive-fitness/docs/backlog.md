# Svasthic backlog

Saved on 11 October 2026. This is a reference list, not permission to start work or a change to the project task queue.

## Delivery rules

- Work on one agreed task at a time.
- Explain the user journey before implementing it.
- Report changes, checks, and a short user-verification checklist after each task.
- Wait for explicit user approval before completing that task or starting the next.
- Preserve existing personal content, past logs, and active workouts.
- Sequences contain individual activities only. Routines may contain activities and flat sequences; sequences cannot contain other sequences.

## Already delivered / awaiting separate review

- **Task #48 — Activity import — Review, link, or create:** merged. Do not recreate this task; build subsequent work on the actual merged implementation.
- **Task #43 — Phase 1 — Clear import/export entry points:** remains active and unapproved, with a replanning hold. Saving this backlog does not approve or complete it.

## Remaining content journeys

### 1. Import activities while building a routine

**Journey:** Open a routine draft → Add activities → Import file or paste JSON → Review activity matches and differences → Choose catalogue activities or custom copies → Add to the draft.

Also expose this journey through **Import activities** in the Library-home routine card menu once that menu exists.

**Expected result**
- Existing routine items, order, repeats, notes, and targets remain intact.
- Incoming activities are added explicitly, not used to replace the routine.
- Reuse the activity review and comparison behavior delivered in Task #48.
- Cancellation preserves the existing draft.

**Decision before execution:** Are new custom activity definitions saved immediately after import confirmation, or staged until the routine is saved? Define what cancelling the routine does.

### 2. View routines without editing

**Journey:** Tap a routine card → Read the whole routine → Explicitly choose another action if needed.

**Expected result**
- Read-only view shows ordered activities/sequences, targets, rest, load/units, and notes without entering the editor.
- Library-home cards have a vertical three-dot menu containing **Edit**, **Import activities**, and **Export routine**.
- Starting a workout remains a distinct explicit action.
- View all routines shows vertically stacked cards; tapping views a routine, and **Export** is their only direct card action.
- Schedule, duplicate, archive, and delete management can be located in the routine view rather than cluttering cards.

**Decision before execution:** Agree the routine-view action layout and placement of management actions.

### 3. Import a whole routine into a new builder draft

**Related existing draft:** **Task #49 — Let users review an imported routine before adding it.** Use or refine that draft rather than creating duplicate work.

**Journey:** Create routine → Import routine → Review activities and targets → Resolve catalogue/custom choices → Open editable routine draft → Save explicitly.

**Expected result**
- Preserve order, repeated members, sequence sides, notes, and workout targets.
- Reuse existing catalogue definitions or create custom copies according to explicit reviewed choices.
- Import does not automatically save the routine, start a workout, or schedule it.
- Missing targets remain visible and are not filled with guessed values.

**Decisions before execution**
- How does a user choose when a file contains multiple routines?
- What happens to newly imported custom activities if the routine draft is discarded?

### 4. Delete routines without affecting past records

**Journey:** Open routine → Delete → Review consequences → Confirm.

**Expected result**
- A routine can actually be deleted, not only archived.
- Past-day records and completed sessions display their own stored copies without needing the saved routine.
- Editing or deleting a saved routine cannot rewrite history.
- Active sessions remain intact.
- Any usable relationship to saved routines is restricted to future scheduled occurrences.

**Decision before execution:** Should future scheduled sessions survive as independent copies or be removed? Show that consequence before confirmation.

### 5. Export directly from the relevant content

**Journey:** Routine card menu or activity/routine view → Export → Local readable preview → Copy, share, or save JSON.

**Expected result**
- A singular export does not redirect to a generic selection screen.
- Export the selected displayed/stored version, not an unrelated latest definition.
- Include the required supporting activity/sequence definitions, order, targets, notes, units, and attribution.
- Export from an editor includes the current visible unsaved draft without saving it.
- Cancel or return from export preserves the draft.
- Missing dependencies produce an explanation rather than silent substitution.

**Decision before execution:** Agree the compact preview/share presentation and any separate multi-item export entry.

## Verification follow-ups

- **Task #50 — Verify activity JSON import on a real Android phone:** verify native file picking, pasted JSON, comparison and reuse/custom-copy choices, flat-sequence handling, cancellation, and persistence. Check the task's latest scope before starting.

## Earlier Android alpha follow-ups

These were present in the earlier queue snapshot. Reconfirm their current status and relevance before activating them; they are not newly requested work.

- **Task #9 — Choose Tempo’s permanent Android identity after account verification:** settle the permanent Android app identifier and account setup before a store release. The older task title predates the visible Svasthic rebrand.
- **Task #10 — Verify Tempo’s first-launch and recovery flows on a real Android phone:** retain the broader launch/recovery verification, avoiding overlap with Task #50's activity-import checks.
- **Task #11 — Restore online catalog refresh in Tempo’s alpha preview environment:** check whether this is still unresolved before doing any fix.

## Longer-term, not part of the next implementation steps

- A clear AI format guide and a separate copy-for-AI handoff after the core content journeys work.
- Live external API/MCP/SSE integration only after a separately agreed scope.
- Android alpha/store distribution as a separate release plan.
- Apple distribution later; Android was the user's first release priority.

## Superseded plans — do not execute

The old exchange-screen-first rollout was rejected. These tasks are not instructions for remaining implementation:

- **Task #44 — Superseded — Exact-version export plan**
- **Task #45 — Superseded — Draft export plan**
- **Task #46 — Superseded — Central import review plan**
- **Task #47 — Superseded — AI handoff plan**

Useful requirements from those plans are represented in the contextual journeys above, but the old plans must not automatically resume.

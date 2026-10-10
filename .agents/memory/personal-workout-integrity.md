---
name: Personal workout integrity
description: Non-obvious compatibility and ownership rules for catalog integration and old local records.
---
Catalog knowledge is not an instruction to rewrite a person's workout. Pin selected definitions when saving routines and sessions; preserve both old repetitions and duration defaults separately even when only one was selected.

**Why:** The user requested lossless incremental integration: catalog updates and custom-author edits must never silently alter saved workouts, history or an in-progress session.

**How to apply:** Treat catalog refresh and local-record migration as separate operations. Do not resnapshot old dated workouts to obtain richer metadata. Preserve recovery copies rather than deleting legacy storage during an upgrade.

Canonical identifier validation permits underscores from existing device-authored IDs. Do not normalize those identifiers by renaming them.

**Why:** Renaming an old custom ID would break its routine, schedule and history references; accepting the original identifier preserves identity without rewriting saved records.

**How to apply:** Keep catalog and personal knowledge on the same schema, including identity compatibility. New validation must not invalidate established local IDs.

---
name: Post-merge timing
description: Runtime budget for unattended workspace reconciliation.
---

Do not assume dependency installation has finished when pnpm prints “Already up to date.” Allow enough time for lifecycle hooks, API generation and schema checks in the complete post-merge sequence.

**Why:** A warm frozen-lockfile installation took about 23 seconds and the full setup took about 47 seconds, exceeding the previous 20-second timeout without any dependency error.

**How to apply:** Use a buffered timeout for full workspace setup and step-level output to distinguish normal runtime from a hang. Keep database synchronization non-forced; approval prompts require review, not automatic acceptance.

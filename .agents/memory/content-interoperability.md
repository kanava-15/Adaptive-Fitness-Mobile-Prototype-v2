---
name: Content interoperability
description: Approved initial exchange scope and long-term purpose of outside AI interoperability.
---

The user wants people to use their own AI assistant, which has their life context, to create fitness content and bring it into Svasthic. The approved first release exchanges JSON files and pasted JSON for activities, sequences, and routines; it does not import scheduled fitness plans or provide live API access.

**Why:** The user chose file-based exchange and content-only imports as the initial scope, while describing outside read/write access and potential AI integration as the long-term direction.

**How to apply:** Keep selective content exchange separate from whole-device backup replacement. Do not add accounts, cloud personal-data storage, live MCP/API access, or scheduling imports without a subsequent scope decision.

The user requested complete planning in simple, clear words before further import/export code: every user journey and touchpoint, what can be exported/imported, what details travel, and the exact format.

**Why:** The user explicitly corrected the planning approach: “do a complete planning before jumping to code.”

**How to apply:** Explain the content-exchange experience and distinguish current behavior from proposed changes before implementation; settle open behavior decisions rather than hiding them inside technical tasks.

Editor exports should include the current visible draft, including unsaved changes, without saving it or changing the stored original.

**Why:** The user explicitly selected “Current draft, without saving” rather than exporting only the last saved version.

**How to apply:** Preserve editor draft state through export and cancellation, and distinguish editor exports from saved-version exports. Never require an implicit save just to share current content.

For this content-exchange rollout, the user requires testable phases/tasks/subtasks and verification after each task. Only after their approval may the current task be marked complete or the next task begin.

**Why:** The user explicitly requested approval-gated, incremental delivery rather than a single all-at-once implementation.

**How to apply:** Activate one phase at a time. After changes and checks, report what changed and provide a short verification checklist, then wait for explicit approval; passing automated checks or dependency readiness is not approval.

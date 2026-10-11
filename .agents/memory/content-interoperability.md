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

The user scrapped the exchange-screen-first plan and requested business-side, contextual journeys, one incremental step at a time: importing activities first, then routines. They want known saved/shared/built-in catalog identifiers to link imported activities rather than always creating duplicates.

**Why:** The user rejected unnecessary redirection and asked to rethink all entry points before more implementation.

**How to apply:** Start with activity link-or-create review. For a catalog counterpart, ask during import whether to use the catalog activity or save a custom copy, and offer View differences comparing the existing and incoming definitions. Never silently overwrite or treat a claimed catalog ID as evidence of trust. Importing a whole routine belongs in new-routine assembly; adding imported activities to an existing routine is a separate journey.

Do not allow sequences nested inside sequences. Sequences contain individual activities only; routines can contain activities and flat sequences.

**Why:** The user questioned allowing nested sequences and stated “I don't think so”; keep the content hierarchy simple and understandable.

**How to apply:** Enforce this for new imports and future sequence authoring, preserve valid repetition/order/sides, and reject nesting explicitly rather than silently flattening or rewriting existing saved content.

The user wants tapping a routine card to open a complete read-only view. Library-home cards should have a vertical three-dot menu with Edit, Import activities, and Export routine. In the stacked all-routines list, Export should be the only direct card action and should not redirect to a generic single-item selection page.

**Why:** The user explicitly said viewing should not require entering edit mode and objected to unnecessary export navigation.

**How to apply:** Separate viewing, editing, starting, and importing; keep contextual export local to the selected routine. Do not expand the home-card menu without settling that with the user.

The user wants actual routine deletion and independent past-day records: “only future date routines can be linked back,” so routine changes must leave past logs unaffected.

**Why:** The user wants saved routines to be removable without losing or rewriting recorded history.

**How to apply:** History must render from its own stored content, not require the saved routine. Agree future-schedule behavior and protect active sessions before implementing deletion.

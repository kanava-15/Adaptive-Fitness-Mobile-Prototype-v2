---
name: TypeScript dependency cache
description: React declaration errors after workspace package changes may be stale incremental resolution.
---
After changing pnpm workspace dependencies, apparent third-party React declaration failures can survive a correct install in TypeScript's incremental cache. A fresh non-incremental check can pass while the normal incremental check still reports missing component props or an unknown context type.

**Why:** Dependency relinking left the canvas check using earlier unresolved React declarations. Running the same check without incremental state succeeded; removing its generated build-info cache restored the normal workspace check.

**How to apply:** Confirm dependency/type availability first, then compare a non-incremental check before editing otherwise-working third-party UI wrappers. If only the cached check fails, invalidate generated build-info state, not application source.

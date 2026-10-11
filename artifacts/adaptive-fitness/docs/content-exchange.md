# Fitness content exchange

Portable fitness content v1

This is a local-first, human-reviewed exchange, not a device backup. Export selected public or custom activities, sequences and routines. Give the JSON to your own AI assistant, review its reply here, then explicitly add it to your library. The chosen external app receives this content, including routine notes. Profile, schedule, history, bookmarks, presets and running sessions are not included.

JSON Schema: urn:svasthic:content:v1 — content-package-v1.schema.json. Copy the schema below or use lib/activity-catalog/docs/content-package-v1.schema.json in the source. Examples are available here and in artifacts/adaptive-fitness/docs/content-examples/.

Top-level fields: format="svasthic-content", version=1, title, author (text or null), activities, routines, selection. All objects are strict: unknown fields are errors. A UTF-8 file or pasted object must be at most 2 MiB. Limits: 500 activity definitions, 100 routines, 600 selected roots, 100 sources per definition/attribution, 500 members per sequence, 500 items per routine, 32 nesting levels, 500 expanded leaves per sequence. Text fields are limited to 4000 characters; knowledge instruction/alias arrays to 100 strings and media references to 30. The JSON Schema specifies every field-level bound.

Each activity entry has a package-local ref, origin (id, version, kind), dosage-free activity knowledge, sources, ordered members, and optional attribution. Original IDs and versions are metadata, not reference keys. Distinct refs may represent distinct pinned versions of the same originating ID. Match references exactly; never by names. All sourceIds, benefit sources, lineage sources and media sourceIds must resolve to sources in that entry. Original review/authorship claims are attribution only; imported local trust is always user-authored, unreviewed, and ineligible for automatic adaptation.

Sequence members contain activityRef and side. Array order is execution order; repeated references are intentional. Nested sequences must be included, nonempty and acyclic. Members refer only to definitions inside this package. Routines prescribe leaves: expand a sequence into ordered repeated leaf items before assigning targets.

Routine: ref, originId (or null), name, notes, items. Each item: activityRef, sets (1–20), restSec (0–600), unit (kg/lb), perSide, priority (must/normal/optional), locked; optional side, note, load (0–1000), and exactly one target: reps (integer 1–200), seconds (5–3600), breaths (integer 1–10000), distance (positive ≤1000000 with distanceUnit m/km/mi/yd). Zero load is explicit and preserved. A target must be supported by its activity; load and distance units must be supported. Missing dose is a valid draft: omit all four target fields, never invent a number. Import never trusts a confirmation flag. Review targets here or later in the routine editor; incomplete drafts cannot launch or schedule.

Unknown knowledge remains unknown: null anatomy/equipment/commonMistakes, unknown difficulty/laterality, empty source-qualified benefits when not established. An empty array means no applicable/attached facts, not evidence of safety. Do not infer muscles, loading suitability, lineage, therapeutic benefits or expert review.

Import adds fresh local identities without replacing anything. Name/original-ID matches are explained, not fuzzy-merged. An identical package is blocked unless you request an intentional copy. Double approval of one review cannot duplicate it; changes to your library require a new review. Saving failure is an error, not durable success.

No schedule/profile/history import, workouts started by import, remote URLs, media downloads, executable instructions, automatic prose conversion, live AI calls, accounts or cloud sync. Whole-device backup/restore in You stays separate and still supports older Tempo backups. Future authenticated API/MCP adapters may reuse this parser and reviewed append-only operation; their authentication/cloud architecture is deliberately deferred.

## Copyable AI prompt

Create or revise a Svasthic portable fitness-content package for me using the life context I provide. Return ONLY a JSON object conforming to version 1 of schema urn:svasthic:content:v1 (content-package-v1.schema.json). I will paste or attach the schema, an example and my selective export below.

Use format "svasthic-content", version 1, title, author identifying you as an outside AI assistant, activities, routines and selection. Include every referenced activity and transitive sequence dependency. Use unique package-local refs; never resolve by names. Preserve original IDs/versions, source attribution, pinned definitions, array order, repeats, sides, notes and explicit zero load. Keep separate refs for different pinned definitions of one originating ID. To revise knowledge, give it a distinct ref and accurately described origin; do not claim catalog/expert authorship.

Knowledge is dosage-free. Keep absent anatomy/equipment as null and absent difficulty/laterality as "unknown". Do not invent evidence, provenance, safety claims, therapeutic benefits or automatic adaptation permissions. Use authorship "user", reviewStatus "unreviewed" and adaptation {eligible:false,loadingKnown:false,loadedJoints:[],rationale:"External AI content; suitability not established."} for new definitions.

Routine targets are separate items using activityRef, sets 1–20, restSec 0–600, unit kg/lb, perSide, priority and locked. Supported targets: reps 1–200 integer; seconds 5–3600; breaths 1–10000 integer; positive distance up to 1000000 with m/km/mi/yd. Load 0–1000 only with a supported load unit. Use exactly one supported measurement per item. If a target is not established, omit it and explain what I need to review; do not insert defaults or confirmed flags. Expand nested sequences into ordered repeated leaf routine items when prescribing targets.

Do not add unknown fields, profiles, schedules, dates, histories, executable content, media downloads or live API instructions. Limits: 2 MiB, 500 activities, 100 routines, 500 sequence members/items, 32 nested levels, 500 expanded leaves. I explicitly review all content and targets before using it.

# Product Requirements Document: Library & Activity Catalog

## 1. User Personas

**Persona 1: The Optimizer (Structured Lifter / Athlete)**

* **Profile:** Knows their split, tracks metrics strictly (reps, weight, RPE). Uses gym equipment.

* **Needs:** Speed in building routines. Ability to add highly specific variations (e.g., "Cable Face Pulls") if not in the database.

* **Behavior:** Rarely browses for discovery; primarily searches for exact terms to build rigid routines.

**Persona 2: The Holistic Mover (Yoga / Mobility / Calisthenics)**

* **Profile:** Mixes disciplines. Cares about joint mobility, flexibility, and bodyweight mastery.

* **Needs:** Needs to find activities by anatomical focus (e.g., "Thoracic Spine") or Sanskrit names. Frequently uses "Sequences" (e.g., Sun Salutations) rather than single exercises.

* **Behavior:** Explores based on how their body feels that day. Combines rigid sets with fluid flows.

**Persona 3: The Explorer (Fitness Novice)**

* **Profile:** Wants to be healthier but lacks deep fitness knowledge.

* **Needs:** High-level guidance. Searches by basic categories or available equipment.

* **Behavior:** Relies heavily on clear discovery categories and pre-built shared catalog sequences. Intimidated by complex anatomical filters.

## 2. Jobs to Be Done (JTBD)

### Routine & Sequence Management

* **JTBD 1:** When I am planning my week, I want to assemble individual exercises and pre-made sequences into a single Routine, so I have a ready-to-execute plan at the gym.

* **JTBD 2:** When I arrive at the gym, I want to instantly access my saved Routines, so I can start my workout without friction.

### Activity Creation & Management

* **JTBD 3:** When my coach or physio gives me a highly specific movement, I want to create and save a Custom Activity, so I can track it alongside standard catalog movements.

* **JTBD 4:** When I frequently use a specific activity from the shared catalog, I want to save it to "My Activities", so I can find it instantly without searching the whole database.

### Filtering & Discovery

* **JTBD 5:** When I have limited equipment or time, I want to filter the shared catalog by "No Equipment" and "Beginner", so I only see actionable options.

* **JTBD 6:** When my lower back is stiff, I want to browse a curated list of "Spine Mobility" activities, so I can find relief without needing to know the exact names of the stretches.* **JTBD 6:** When I want to focus on a specific area, I want to quickly jump into the catalog filtered by "Joint mobility", so I can find relevant activities without needing to know their exact names.</comment-tag>

## 3. UI Prototype Plan

### A. Library Landing Page (The Hub)

**Goal:** Central dashboard for execution (Routines) and guided discovery.

* **Top App Bar:** Page Title ("Library") + Search Icon (Magnifying Glass).

* **Section 1: Routines (Horizontal Carousel)**

  * Card 1: `[+ New Routine]` (Action button).

  * Card 2+: User's saved routines (Name, Est. Duration, "Start" CTA).

* **Section 2: My Activities (Compact Row)**

  * Tile 1: `Saved & Custom (Count)` -> Links to personal inventory list.

  * Tile 2: `[+ Create Custom]` -> Opens activity creation form.* **Section 2: My Activities (Compact Row)**

  * Tile 1: `Saved Activities (Count)` -> Links to favorited shared catalog items.

  * Tile 2: `Custom Activities (Count)` -> Links to user-authored activities.

  * Tile 3: `[+ Create Custom]` -> Opens activity creation form.</comment-tag>

* **Section 3: Discover (Vertical Scroll)**

  * **Goal Pills (Horizontal row):** Quick-filter chips (e.g., "Posture", "Joint Health", "Core").

  * **Curated Carousels:** e.g., "Trending Mobility", "No-Equipment Flows".

  * **Discipline Grid:** 2x2 grid (Strength, Yoga, Mobility, Cardio). Tapping one opens the Explore Modal pre-filtered.* **Section 3: Discover (Vertical Scroll)**

  * **Primary Action:** Large, visible `[Search the shared catalog]` button or input field to ensure the main discovery path is immediately obvious.

  * **Discipline Grid:** 2x2 grid (Strength, Yoga, Joint mobility, Cardio). Tapping one opens the Explore Modal pre-filtered.

  * *(Deferred to V2)* **Goal Pills & Curated Carousels:** Will be introduced once catalog tags and sourced recommendations are fully validated.</comment-tag>

### B. Global Search & Explore Modal

**Goal:** Deep database querying triggered via the Top App Bar Search Icon, the Discover search button, or "Discover" grid.

* **Header:** Search Bar (accepts text, aliases, Sanskrit).

* **Filter System (Progressive Disclosure Bottom Sheet):**

  * *Primary (Always visible):* Discipline, Difficulty, Equipment.

  * *Secondary (Inside Collapsible Accordions):* Movement Area, Muscle, Joint, Activity Type (Asana, Exercise, Sequence).

* **List View:**

  * Results display Title, Subtitle (Alias/Translation), and primary tags.

  * Visual distinction between a "Single Activity" and a "Sequence".

* **User Actions on Item Tap:**

  * Opens Activity Details Sheet (Instructions, target muscles, history).

  * CTAs: `[Add to Routine]` or `[Save to My Activities]`.

### C. Routine Builder Flow

**Goal:** Frictionless assembly of workouts.

* **Header:** Routine Name (Editable) & Notes (Optional).

* **Body (The List):** Drag-and-drop list of added activities.

* **Footer:** Sticky `[+ Add Activity]` button.

* **Adding Workflow:**

  1. Tapping `+ Add Activity` opens a variation of the Explore Modal.

  2. User searches/filters -> taps `[Select]` on items.

  3. User can select Single Activities OR full Sequences.

  4. Selected items append to the Routine list.

* **Configuration:** Once in the list, users can tap an item to set targets (Reps, Sets, Duration, Rest).

### D. Custom Activity Builder Flow

**Goal:** Empower advanced users to expand their personal library.

* **Entry:** Tapping `[+ Create Custom]` from the Library Landing Page.

* **Form Inputs:**

  * Name (Required).

  * Discipline (Single select).

  * Equipment Needed (Multi-select chips).

  * Measurement Type (Reps, Duration, Distance, Breaths).

* **Save Action:** Saves locally to the device under "My Activities". Automatically tagged with a visual "Custom" badge so users know it is unverified by the platform.
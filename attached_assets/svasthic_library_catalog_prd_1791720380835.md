# Product Requirements Document (PRD): Svasthic Library & Catalog

## 1. Executive Summary & Business Decisions
The Svasthic Library is transitioning from a raw "database viewer" into an intuitive, Material Design 3 (Material You) "lifestyle and wellbeing dashboard." Our primary business goal is to serve a highly versatile fitness data model (spanning atomic exercises, composite sequences, and duration-based sports) through a UI that prevents cognitive overload ("chip soup"). 

**Key Product Decisions:**
*   **Material Design 3 Paradigm:** Utilize soft tonal surfaces, pill-shaped buttons, and progressive disclosure instead of rigid tabs and harsh borders.
*   **Dashboard over Tabs:** The library will use a vertical dashboard hierarchy prioritizing actionable items (Routines) at the top, personal building blocks (Custom/Saved Activities) in the middle, and platform discovery (Catalog) at the bottom.
*   **Distinct Ownership:** Clear separation between "Saved" (platform-curated catalog bookmarks) and "Custom" (user-created) activities to match user mental models.
*   **Sports Integration:** Treat sports as a primary discipline alongside Yoga, Strength, and Mobility. Sports default to duration-based measurement and hide hyper-specific anatomical tags (like "Cervical Spine") to reduce friction.
*   **Safe Terminology:** Avoid medical or trademarked claims. Use descriptive terms like "Joint mobility" instead of "Joint Health" or trademarked acronyms.

---

## 2. User Personas

### Persona A: "The Quick Adder" (The Executor)
*   **Profile:** Knows exactly what they want to do today. They treat the app as a highly efficient tool for tracking and routine building. 
*   **Pain Point:** Being forced to read through paragraphs of anatomy or scroll through endless filters just to add a standard "Goblet Squat" or "30-Min Run" to their workout.
*   **Needs:** Glanceable UI, fast search, one-tap actions, and immediate access to their existing routines.

### Persona B: "The Explorer" (The Learner)
*   **Profile:** Looking for guidance, injury prevention, or new ways to move. They might be searching by intent (e.g., "tight hips") rather than by specific exercise names.
*   **Pain Point:** Adding an exercise they don't know how to perform safely, or being confused by complex fitness jargon without visual aids.
*   **Needs:** High-quality media (YouTube embeds), clear safety precautions, step-by-step instructions, and an understanding of *why* an activity is beneficial.

---

## 3. Jobs to be Done (JTBD)

### For the "Quick Adder":
*   **JTBD 1:** When I open the Library, I want to immediately see my saved routines so I can start my workout with zero friction.
*   **JTBD 2:** When building a routine, I want to use an AI-assisted search to instantly find "Tennis" or "Goblet Squat" and add it to my plan without leaving the screen.
*   **JTBD 3:** When I do an obscure movement that isn't in the shared catalog, I want to quickly create and save a "Custom Activity" so my tracking remains accurate.

### For the "Explorer":
*   **JTBD 1:** When my shoulders feel tight, I want to search the catalog for "shoulder mobility" and find a pre-built sequence I can follow.
*   **JTBD 2:** When browsing the catalog, I want to tap on a card to watch a video preview and read the precautions so I don't injure myself.
*   **JTBD 3:** When I find an activity I like but don't want to do right now, I want to "Save" it to a dedicated bookmark list for future exploration.

---

## 4. UI Prototype Plan & Architecture

### A. The Landing Library Page (The Dashboard)
Replaces the flat tabs with a prioritized vertical feed.
*   **Top App Bar:** Large "Library" title. Contains a prominent AI Search Pill ("✨ Describe what you want...").
*   **Section 1: Routines (Top Priority):**
    *   Horizontal carousel of routine cards.
    *   First card is a persistent, dashed "+ New Routine" button.
*   **Section 2: My Activities (Building Blocks):**
    *   Three distinct pill/tiles: `[ 🔖 Saved (12) ]`, `[ ✏️ Custom (4) ]`, and `[ + Create ]`.
*   **Section 3: Discover (Catalog Entry):**
    *   Massive, unmissable primary button: **"Search the shared catalog"**.
    *   Browse Grid: 4 square, tonal tiles (Strength, Yoga, Mobility, Sports) serving as quick-filters.

### B. The Explore & Filtering Experience
*   **Trigger:** Activated via the Top Bar AI Pill, the "Search catalog" button, or tapping a Browse Grid tile.
*   **Layout:** A feed of Scannable Catalog Cards.
*   **Filter Bottom Sheet (Progressive Disclosure):** 
    *   *Primary (Always Visible):* Discipline, Difficulty, Equipment.
    *   *Secondary (Hidden in Accordions):* Target Muscle, Target Joint, Activity Type. (These accordions are disabled/hidden if the "Sports" discipline is selected).

### C. Catalog Cards (The Feed)
Designed for the *Quick Adder* to scan rapidly.
*   **Visuals:** Soft Material You tonal backgrounds (e.g., Blue for Strength, Orange for Sports).
*   **Media:** 16:9 thumbnail image placeholder (future GIF/Video space).
*   **Data Displayed:** Title, Visual Sequence Badge (if applicable), and max 2-3 primary chips (e.g., ⏱️ 15 Min, ⚡ Beginner).
*   **Actions:** 
    *   Left side: "Save" (Bookmark icon).
    *   Right side: Primary "+ Add" button.

### D. Activity Detail View (Read & Understand)
Designed for the *Explorer*. Triggered by tapping the body of a catalog card.
*   **Format:** A large, modal Bottom Sheet that slides up.
*   **Top:** Immersive 16:9 Media container (embedding YouTube iframe).
*   **Body:** 
    *   Short "Why" description.
    *   Anatomy Tags: Full display of Muscles and Joints in soft pill containers.
    *   Precautions Box: Highlighted in a soft red/warning tonal container.
    *   Step-by-step instructions.
*   **Footer:** Sticky bottom bar featuring the primary "+ Add to Routine" action.

### E. The "Add To..." Flow
When a user clicks "+ Add" from either the feed card or the detail sheet, they should not be dropped into a rigid, disruptive flow.
*   **Action:** Opens a compact, tactile Material You bottom sheet.
*   **Options Presented:**
    1.  **Add to Today's Queue:** Drops the item directly into an active, temporary workout session.
    2.  **Existing Routines:** A scrollable list of their saved routines (e.g., "Leg Day", "Morning Warmup"). Selecting one inserts the activity into that routine ("Sandwich" use case).
    3.  **Create New Routine:** Starts a brand new routine framework with this activity as the first item.
# UI/UX Specification: Search & Explore Experience

This document details the layout, interaction design, and filtering mechanics for the discovery side of the Library. It separates passive discovery (Explore) from active querying (Global Search).

## 1. The "Explore" Section (Passive Discovery)

**Location:** Bottom half of the main Library Landing Page.
**Objective:** Provide zero-friction inspiration and guided entry points into the massive catalog without requiring the user to type a query.

### UI Layout

* **Header:** "Discover" (Large, bold).

* **Component 1: Intentions (Horizontal Scroll Row)**

  * *Visual:* Pill-shaped chips (e.g., `[Posture Reset]`, `[Desk Worker Relief]`, `[Knee Bulletproofing]`).

  * *Interaction:* Tapping a pill transitions the user to the Global Search Modal, pre-populated with the complex backend query (e.g., "Posture Reset" silently applies filters: `Type: Mobility + Joint: Thoracic Spine, Cervical Spine`).

* **Component 2: Curated Carousels (Horizontal Scroll)**

  * *Visual:* Medium-sized rectangular cards with lifestyle or anatomical graphics.

  * *Examples:* "Trending this week", "No-Equipment Flows", "Master the Basics".

  * *Data:* These are essentially saved search queries managed by the backend, displayed visually.

* **Component 3: Discipline Grid (2-Column Grid)**

  * *Visual:* Square, colorful tiles representing high-level categories (`Strength`, `Yoga`, `Mobility`, `Cardio/Warmup`).

  * *Interaction:* Tapping drops the user into the Global Search Modal with the `Discipline` filter pre-applied.### UI Layout

* **Header:** "Discover" (Large, bold).

* **Component 1: Explicit Search Entry**

  * *Visual:* A prominent, faux search bar or large text button labeled "Search the shared catalog".

  * *Interaction:* Tapping this invokes the full-screen Global Search Modal. This ensures the primary path to discovery isn't hidden solely behind an icon.

* **Component 2: Discipline Grid (2-Column Grid)**

  * *Visual:* Square, colorful tiles representing high-level categories (`Strength`, `Yoga`, `Joint mobility`, `Warmup / Cardio`).

  * *Interaction:* Tapping drops the user into the Global Search Modal with the `Discipline` filter pre-applied.

* **Deferred Features (V2):**
  * Goal-based intention pills and curated carousels are deferred until the underlying catalog tags and sourced recommendations are fully validated to avoid unsubstantiated claims.</comment-tag>

## 2. Global Search Modal (Active Querying)

**Entry Point:** Tapping the Search Icon (🔍) in the top App Bar, OR tapping any pill/tile in the "Explore" section.**Entry Point:** Tapping the Search Icon (🔍) in the top App Bar, tapping the explicit "Search catalog" button in the Discover section, OR tapping a Discipline tile.</comment-tag>
**Objective:** A dedicated, full-screen takeover designed for fast, powerful querying.

### UI Layout: The Header (Sticky)

* **Top Row:**

  * `[< Back]` arrow (returns to Library).

  * **Search Input Field:** Large placeholder text ("Search activities, Sanskrit, aliases...").

  * **Filter Icon Button:** Placed directly inside or adjacent to the search input field. Displays an active state (e.g., a small red dot or badge count) if filters are currently applied.

* **Active Filters Row (Horizontal Scroll):**

  * Directly beneath the search bar. Shows dismissible chips for currently applied filters (e.g., `[Yoga (x)]`, `[No Equipment (x)]`).

  * *Interaction:* Tapping the 'x' removes the filter and auto-refreshes the list below.

### UI Layout: The Results Body (Vertical Scroll)

* **Empty State (Before typing):** Show "Recent Searches" or a subtle prompt like "Try searching for 'Downward Dog' or 'Squat'".

* **List Items (Cards/Rows):**

  * *Title:* Primary Name (e.g., "Adho Mukha Svanasana").

  * *Subtitle:* Alias/Translation (e.g., "Downward-Facing Dog").

  * *Visual Indicator:* A small icon denoting if it's a `Single Activity` (e.g., a dumbbell icon) or a `Sequence` (e.g., a stacked-cards icon).

  * *Trailing Action:* A quick `[+]` button to instantly add it to a routine or save to 'My Activities' without opening the detail page.

## 3. The Filter System (Progressive Disclosure)

**Entry Point:** Tapping the Filter Icon next to the Search Bar.
**Objective:** Tame the complex taxonomy (8+ categories) by prioritizing common constraints and hiding niche anatomical filters until requested.

### UI Layout: Bottom Sheet

* The filter menu slides up from the bottom (Sheet), covering 80% of the screen. This allows users to retain context of their search.

* **Header:** "Filters" + `[Clear All]` text button.

* **Footer (Sticky):** `[Show XX Results]` button.

### Section A: Primary Filters (Always Expanded)

These are the most common constraints users apply when they hit a roadblock (time, gear, capability).

* **Discipline:** Single-select or Multi-select chips (Yoga, Joint mobility, Strength).

* **Equipment:** Horizontal scrolling row of chips. *Dynamic logic: If "Yoga" is selected above, "Barbell" is hidden.*

* **Difficulty:** Segmented control (`Beginner` | `Intermediate` | `Advanced`).

### Section B: Secondary Filters (Collapsed Accordions)

These cater to the "Optimizer" and "Holistic Mover" personas looking for highly specific anatomical targets.

* **Accordion 1: Anatomy ⌄**

  * When expanded, shows categorized chips for `Muscle Group` (Quads, Lats) and `Joints` (Thoracic Spine, Hips).

* **Accordion 2: Activity Type ⌄**

  * When expanded, shows chips for `Exercise`, `Asana`, `Mobility-Drill`, `Sequence`, `CARs`.

* **Accordion 3: Measurement & Targets ⌄**

  * When expanded, shows chips for `Reps`, `Duration`, `Breaths`.

### Interaction Rules

1. **Real-time Updates:** As the user taps chips in the Bottom Sheet, the `[Show XX Results]` button in the sticky footer instantly updates its count (e.g., from "Show 414 Results" to "Show 12 Results").

2. **No Dead Ends:** If a combination yields 0 results, visually disable conflicting chips. (e.g., If `Bodyweight` is selected, `Bench Press` related muscles might gray out).
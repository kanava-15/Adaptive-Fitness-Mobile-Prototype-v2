---
name: Product direction
description: Audience and approved constraints for the adaptive fitness prototype.
---
The user identifies busy professionals as the audience. The approved initial direction is actionable session cards with quick adaptations, timers, rep logging, and saved history rather than requiring chat for routine actions.

**Why:** The user wants to establish practical value beyond a general assistant before building a broad personal progression system.

**How to apply:** Keep the first release focused on disrupted fitness sessions. Do not add AI chat, RPG features, accounts, or cloud dependencies without a subsequent scope decision. Preserve the local-first and explainable-adaptation principles from the supplied blueprint.

The user chose “Only my workouts”: Today and Plan must show only workouts the user chooses or schedules, not automatically generated suggested sessions.

**Why:** The user found unsolicited sessions annoying because they were not routines and could not be edited or removed.

**How to apply:** Do not reintroduce automatic sessions through setup, daily rollover or imports. Keep adaptation available for the user's own workouts, and preserve active sessions and historical records from older versions.

Users should be able to author routines, choose library or custom exercises, and schedule specific dates or recurring weekdays.

**Why:** The user explicitly requested workout choice and editing, with gym, yoga and joint-mobility tracking rather than only generated circuits.

**How to apply:** Treat user-authored schedules as intentional choices. Adaptation should preserve priorities, preview changes, and never silently replace those schedules or reinterpret rehabilitation prescriptions.

The user wants a large library covering gym, Ashtanga-based yoga asanas, joint-related activities and bodyweight training. Library entries describe the activity, not prescribed reps/sets/time/distance; those belong to the routine or day's plan.

**Why:** The user distinguishes activity knowledge from workout dosage and wants rich structured benefits, precautions and muscle metadata that can support future database updates and AI retrieval.

**How to apply:** Use specific activity types rather than calling every entry a move. Preserve structured, versioned knowledge and provenance; future vector retrieval should supplement the canonical records, not replace them.

The user explicitly wants CARs considered for Kinstretch/joint activity coverage, broad Ashtanga coverage beyond the initial Primary Series scope (80+ activities), and hundreds of home/gym exercises.

**Why:** The user wants breadth rather than a small introductory catalog.

**How to apply:** Do not restrict yoga to Primary Series or treat CARs as generic stretches. Source and distinguish real variants; do not inflate counts with aliases or imply official Kinstretch affiliation.
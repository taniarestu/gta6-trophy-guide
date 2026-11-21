# Leonida Platinum Guide — GTA VI Trophy Tracker (PS5)

An offline guide and tracker for all **55 GTA VI trophies** (1 platinum, 2 gold, 6 silver, 46 bronze — 1,350 PSN points, 27 visible + 28 hidden). One playthrough, about 200 hours to platinum, no online trophies.

## What it does

- **Checklist** — every trophy with its official name, description and grade, an earned tick saved in your browser, PSN points and a progress bar.
- **Filters** — by kind (story, character, activities, collectibles, robberies, misc…), grade, text search, not-earned-yet, and missable-only.
- **Spoiler setting** — on by default: hidden story trophies stay masked (“Hidden story trophy — earn it to reveal”) until you earn them.
- **Guide pane** — each trophy has a guide written in our own words, a short cited fact shown right on its card, and its sources named (PowerPyx, Exophase, GTABase).
- **Roadmap** — three steps to platinum (story 60–80 h, 100% checklist ~100 h, cleanup ~10 h) plus the full 100% checklist table.
- **Missables** — exactly one trophy can be missed: Positive Mental Attitude, the Chapter 1 meditation with Lucia. The page explains the morning-after-Down-to-Earth balcony step and the honest uncertainty about whether it counts, plus save advice (15 manual slots, no mission replay).
- **Next-up planner** — the missable trophy first, then story order, character quests, activities and the 100% grind, each with a time estimate.
- **Notes, export/import, reset** — per-trophy notes, progress export/import as JSON, and two themes (paper light + night dark).

## Run it offline

```sh
node serve.ts
# open http://localhost:8080
```

No network calls, no account, no tracking. The only fetch is the local `app/data/trophies.json`.

## Sources (checked 21 Nov 2026)

- Trophy names, descriptions and grades as published on PlayStation, via Exophase.
- Grades and hidden flags cross-checked on GTABase.
- Guidance paraphrased in our own words from the PowerPyx trophy guide and GTABase, with a short cited fact on every card. Two steps are labelled “reported, not fully confirmed” where the sources disagree.

Fan-made guide. Not affiliated with Rockstar Games.

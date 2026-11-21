# gta6-trophy-guide

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/taniarestu/gta6-trophy-guide/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/taniarestu/gta6-trophy-guide/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

**Leonida Platinum Guide** — an offline guide and tracker for all 55 GTA VI PS5 trophies (1 platinum, 2 gold, 6 silver, 46 bronze; 27 visible + 28 hidden), with a sourced guide for every trophy, a 3-step roadmap to the platinum (~200 hours), and progress tracking toward the platinum.

## What this app is

- **Checklist** — all 55 trophies with their official names, descriptions and grades, a tick-box that saves in your browser, PSN points (1,350 total), and a progress bar.
- **Sourced guides** — every trophy card shows a short quote from its source (PowerPyx or GTABase), and the guide pane shows the full guide in our own words plus the source links. Claims that are still unconfirmed are labelled as such.
- **Roadmap** — 3 steps: story (60–80 h) → 100% checklist (~100 h) → Strangers & Freaks cleanup (~10 h), with the full 100% checklist table.
- **Missables** — exactly one possibly missable trophy (Positive Mental Attitude, the Chapter 1 meditation), with the honest uncertainty and a manual-save strategy (15 slots, no mission replay).
- **Next-up planner** — the 3 closest trophies to chase next, based on what you have earned, with time estimates.
- **Filters & search** — by kind (story, character quests, activities, collectibles, robberies), grade, text search, not-earned-only and missable-only. Spoiler protection is on by default: the 28 hidden trophies stay masked until earned.
- **Notes, export/import, reset** — personal notes per trophy, progress export/import as JSON, and two themes (paper light + night dark).

Fully offline: vanilla ES modules + CSS, no framework, no network requests. Trophy data lives in `app/data/trophies.json` (names, descriptions and grades follow the official list as published on Exophase; hidden flags follow GTABase and PlanetGTA6).

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards</sub>

# Project State — Grammar App (Clean)

## Task Counter: 1

## Project Description
Grammar App (Clean) is a client-side sentence diagramming tool for grammar students. Users drag clause, phrase, and part-of-speech tiles from HTML palettes onto a Fabric.js canvas, connect them into tree diagrams via double-click, and export as high-resolution PNG. No build step, no backend -- pure static HTML/JS/CSS with two CDN dependencies (Fabric.js 5.2.4, gif.js 0.2.0).

## Current State
- `index.html` (~338 lines) — Full UI layout: header with export buttons, top palettes (clauses/phrases), Fabric.js canvas workspace with zoom controls, bottom palettes (open-class/closed-class POS). Loads Fabric.js and gif.js from CDN. Inline drag-start event setup.
- `script.js` (~1,093 lines) — Core application logic: Fabric.js canvas setup, tile creation (createTile/createWordTile), connection system (double-click workflow), auto-layout engine (relayoutAll with animated tidy tree), drag-and-drop from HTML to canvas, zoom/pan, PNG export (copy-to-clipboard + download), snap guides, connection preview.
- `style.css` — Empty; all styles are inline in `index.html`.
- `INSTRUCTIONS.md` — Comprehensive user-facing documentation (203 lines): interactions, tile reference, keyboard shortcuts, troubleshooting.
- `CLAUDE.md` deployed; `.memory/` system intact; `.claude/` folder with commands and skills.
- 4 `tmpclaude-*-cwd` temp files in repo root (leftover artifacts, should be cleaned up or gitignored).

## Active Work
- No active feature development or bug fixes in progress.
- Project is in a stable, fully functional state.

## Open Threads
- `style.css` is empty; all styles inline in `index.html`. Could be consolidated.
- gif.js is loaded from CDN but only PNG export is used by the buttons. `makeCroppedGifBlob()` function exists but is unused. Could remove gif.js dependency.
- No test framework or automated testing.
- 4 `tmpclaude-*-cwd` temp files in repo root should be gitignored or removed.
- No touch/mobile support.

## Direction
- Project is stable and feature-complete for core use case (building and exporting sentence tree diagrams).
- This is the advanced version of Grammar-App (the simpler prototype is in `Grammar-App/`).

## Last Updated
- 2026-02-15: v3 deployment health check — verified all files, updated memory to reflect current state

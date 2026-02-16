# Project Map — Grammar App (Clean)

## Root Files
- `index.html` — Main HTML page (~338 lines); UI layout with inline CSS, palette tiles (clauses, phrases, open-class POS, closed-class POS), Fabric.js canvas with zoom controls, export buttons, CDN script imports
- `script.js` — Core application logic (~1,093 lines): Fabric.js canvas setup, tile creation (createTile/createWordTile), connection system (double-click-to-connect with parent/child tree), auto-layout engine (relayoutAll with animated tidy tree), drag-and-drop from HTML palettes to canvas, zoom/pan, PNG export (clipboard + download), snap guides, connection preview line, hover effects
- `style.css` — Empty stylesheet; all styles currently live inline in index.html
- `README.md` — Brief project description ("Grammar-App / Sentence Diagramming Tool")
- `INSTRUCTIONS.md` — Comprehensive user-facing documentation (~203 lines): getting started, building diagrams, managing diagrams, navigation, exporting, tile reference tables, keyboard shortcuts, troubleshooting, browser compatibility
- `.gitattributes` — Git LF normalization config
- `CLAUDE.md` — Project configuration and agent instructions for Claude Code

## Temp Files (should be cleaned up)
- `tmpclaude-9498-cwd`, `tmpclaude-40c4-cwd`, `tmpclaude-e4d7-cwd`, `tmpclaude-e75c-cwd` — Leftover Claude temp files

## Claude Integration
- `.claude/commands/memory-check.md` — Memory health check command
- `.claude/commands/memory-status.md` — Memory status display command
- `.claude/skills/memory-system/SKILL.md` — Memory system skill definition
- `.claude/settings.local.json` — Local Claude settings

## Memory System
- `.memory/state.md` — Current compressed project state (updated every task cycle)
- `.memory/project-map.md` — This file; index of all project files
- `.memory/knowledge-base.md` — Accumulated decisions, solutions, and project knowledge
- `.memory/reference/project-context.md` — Project context extracted from CLAUDE.md during deployment
- `.memory/logs/.gitkeep` — Log directory placeholder
- `.memory/downloads/.gitkeep` — Downloads directory placeholder

## External Dependencies (CDN)
- Fabric.js 5.2.4 — `https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.2.4/fabric.min.js`
- gif.js 0.2.0 — `https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js`

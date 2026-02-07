# Project Map — Grammar App

## Root Files
- `index.html` — Main HTML page; UI layout with inline CSS, palette tiles, Fabric.js canvas, CDN script imports
- `script.js` — Core application logic: tile creation, connection system, tree auto-layout, zoom/pan, drag-and-drop, PNG export (~1,093 lines)
- `style.css` — Additional stylesheet (minimal; most styles are inline in index.html)
- `README.md` — Brief project description ("Grammar-App / Sentence Diagramming Tool")
- `INSTRUCTIONS.md` — Comprehensive user-facing documentation: interactions, tile reference, keyboard shortcuts, troubleshooting
- `.gitattributes` — Git LF normalization config
- `CLAUDE.md` — Project configuration and agent instructions for Claude Code

## Memory System
- `.memory/instructions.md` — Memory compression agent operating instructions
- `.memory/state.md` — Current compressed project state (updated every task cycle)
- `.memory/project-map.md` — This file; index of all project files
- `.memory/knowledge-base.md` — Accumulated decisions, solutions, and project knowledge

## External Dependencies (CDN)
- Fabric.js 5.2.4 — `https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.2.4/fabric.min.js`
- gif.js 0.2.0 — `https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js`

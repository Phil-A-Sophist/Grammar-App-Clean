# CLAUDE.md - Grammar App

## Overview

Grammar App is a browser-based sentence diagramming tool designed for students learning grammar and syntax. Users drag and drop tiles representing clauses, phrases, and parts of speech onto an HTML5 canvas, connect them to form tree diagrams, and export the results as high-resolution PNG images.

The app runs entirely client-side with no backend, build step, or package manager. Open `index.html` in a browser and it works.

## Tech Stack

- **Language:** Vanilla JavaScript (ES6+), HTML5, CSS3
- **Canvas library:** Fabric.js 5.2.4 (loaded from CDN)
- **GIF encoding:** gif.js 0.2.0 (loaded from CDN, used for export fallback)
- **Build system:** None. No bundler, no transpiler, no package manager.
- **Deployment:** Static files. Serve or open `index.html` directly.

## Project Structure

```
Grammar-App-Clean/
  index.html        — Main HTML page; contains inline CSS, palette tiles, canvas element
  script.js         — All application logic: tile creation, connections, tree layout, zoom/pan, export
  style.css         — Additional stylesheet (currently minimal; most styles are inline in index.html)
  INSTRUCTIONS.md   — Detailed user-facing documentation for the app
  README.md         — Brief project description
  .gitattributes    — Git line-ending normalization config
```

## Build / Run Instructions

1. **Run:** Open `index.html` in any modern browser (Chrome recommended). No server required.
2. **Develop:** Edit `index.html`, `script.js`, or `style.css` directly. Refresh the browser.
3. **Test:** Manual testing only. No test framework is configured.
4. **Deploy:** Copy all files to any static hosting (GitHub Pages, Netlify, S3, etc.).

## Key Files

- **`index.html`** — Entry point. Defines the full UI layout: header with export buttons, top palettes (clauses and phrases), the Fabric.js canvas workspace, and bottom palettes (open-class and closed-class parts of speech). Includes inline `<style>` block and a small inline `<script>` for palette drag-start events. Loads Fabric.js and gif.js from CDN.
- **`script.js`** — Core application logic (~1,093 lines). Key subsystems:
  - **Fabric.js canvas setup** and responsive resizing
  - **Tile creation** (`createTile`, `createWordTile`) with color mapping per part of speech
  - **Connection system** — double-click-to-connect workflow with parent/child tree relationships, stored in a `connections` map
  - **Auto-layout engine** (`relayoutAll`) — computes subtree spans and animates tiles into a tidy tree arrangement
  - **Drag-and-drop** from HTML palettes onto the Fabric canvas
  - **Zoom/pan** via mouse wheel and viewport transform
  - **Export** — copy-to-clipboard and download-as-PNG with tight-crop bounding box calculation
  - **Snap guides** and proximity alignment for unconnected tiles
  - **Connection preview** — dashed line follows cursor during connection mode
- **`INSTRUCTIONS.md`** — Comprehensive user guide covering all interactions, tile types, keyboard shortcuts, and troubleshooting.

## Coding Conventions

- No modules or imports; everything is in the global scope.
- Fabric.js groups are used for tiles; each group has a `customId` property (`tile-N`).
- Connections are tracked in a plain object: `connections[parentId] = [childGroupObj, ...]`.
- Animations use `requestAnimationFrame` with ease-out cubic easing.
- Colors are defined in `posColors` map and inline `style` attributes on palette HTML elements.

## Memory System

This project uses an ongoing memory consolidation system. Follow these rules on every task:

1. **Before starting any task:** Read `.memory/state.md` and all `.memory/state-t*.md` snapshot files.
2. **During every task:** Spawn a parallel subagent to handle memory consolidation. The subagent should read and follow the instructions in `.memory/instructions.md`. This runs alongside the main task -- do not wait for it to complete.
3. **The memory agent updates:** `.memory/state.md` every cycle, and `.memory/project-map.md` and `.memory/knowledge-base.md` when the current task produces relevant changes.
4. **Never skip the memory cycle.** Even for small tasks, the parallel agent should run.

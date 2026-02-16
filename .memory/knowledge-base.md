# Knowledge Base — Grammar App

## Architecture
**Current approach:** Single-page static app with no build step. All logic in one JS file (`script.js`), all UI in one HTML file (`index.html`) with inline CSS. Fabric.js manages the canvas and all interactive objects.
**Previously tried:** N/A (initial project state).
**Context:** Designed for simplicity -- students open `index.html` directly in a browser. No server, no bundler, no dependencies beyond two CDN scripts.

## Tile System
**Current approach:** Three tile categories: clauses (white background), phrases (colored), and words (two-part: POS label on top, editable text on bottom). Each tile is a Fabric.js `Group` with a unique `customId` (`tile-N`). Word tiles have a `meta` property with `{ kind: 'word', pos: '...' }`.
**Previously tried:** N/A.
**Context:** Colors are defined in `posColors` map for words and inline styles on HTML palette elements for phrases.

## Connection / Tree System
**Current approach:** Connections stored in `connections` object (`parentId -> [childGroupObjs]`). A reverse `parentOf` map (`childId -> parentId`) is rebuilt on each relayout. Parent/child determined by vertical position at connection time (higher tile = parent). Children sorted by horizontal position.
**Previously tried:** N/A.
**Context:** `relayoutAll()` computes subtree spans and positions all connected tiles in a tidy tree with animated transitions (ease-out cubic via `requestAnimationFrame`).

## Export System
**Current approach:** Two export modes: copy-to-clipboard (PNG via `ClipboardItem`) and download-as-file (PNG via blob URL). Both use `getTightBounds()` for tight cropping with 10% padding, rendered at 3x multiplier. White background is temporarily applied during export.
**Previously tried:** GIF export was implemented (`makeCroppedGifBlob`) but the current buttons use PNG only. gif.js is still loaded.
**Context:** Fallback for clipboard: opens image in new tab. Fallback for download: uses dataURL instead of blob.

## Interaction Model
**Current approach:** Drag-and-drop from HTML palette tiles to Fabric canvas. Double-click to select/connect tiles. Ctrl+click to edit text (opens modal dialog). Click connection lines to remove them (lines turn red on hover). Delete/Backspace to remove selected tile. Escape to deselect. Mouse wheel for zoom, click-drag on empty space to pan. Zoom buttons (+, -, Reset) in top-right of canvas.
**Previously tried:** N/A.
**Context:** Snap guides appear for unconnected tiles during drag. Connection preview (dashed blue line) follows cursor when a tile is selected. Green glow highlights potential connection targets on hover. Tiles have subtle lift shadow on mousedown and scale-up hover effect.

## Relationship to Grammar-App
**Current approach:** Grammar-App-Clean is the advanced, feature-complete version. Grammar-App (in `Grammar-App/`) is the simpler earlier prototype with no Fabric.js, no connections, no tree layout, no export.
**Previously tried:** N/A.
**Context:** Both share the same educational purpose (sentence diagramming for grammar students) but Grammar-App-Clean is the version with the full feature set.

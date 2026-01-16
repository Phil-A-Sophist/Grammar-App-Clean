# Grammar App - User Instructions

A visual tool for diagramming sentence structures, designed for students learning grammar and syntax.

---

## Getting Started

Open `index.html` in a web browser to launch the app. The interface has three main sections:

1. **Top Palettes** - Clause and phrase tiles
2. **Canvas** - The workspace where you build diagrams
3. **Bottom Palettes** - Parts of speech (word) tiles

---

## Building a Diagram

### Step 1: Add Tiles to the Canvas

**Drag and drop** tiles from the palettes onto the canvas:

- **Clauses** (white tiles): S, IC, DC, RC, CC
- **Phrases** (colored tiles): NP, VP, PP, ADJP, ADVP
- **Words** (colored tiles with two sections): NOUN, VERB, ADJ, ADV, DET, PRON, PREP, CONJ, MOD, AUX, INTJ, REL, COMP

Tiles will animate smoothly when dropped and can be repositioned by dragging.

### Step 2: Connect Tiles

To create a hierarchical connection between tiles:

1. **Double-click** the first tile (it will glow blue to show it's selected)
2. **Move your cursor** toward another tile (a dashed preview line follows your cursor)
3. **Double-click** the second tile to connect them

The app automatically determines parent/child relationships based on vertical position (higher tile becomes the parent). After connecting, tiles automatically arrange themselves in a tree layout.

**Tips:**
- A green glow appears on tiles when you hover over them during connection mode
- Press **Escape** or click the canvas background to cancel a selection

### Step 3: Edit Text

Word tiles have an editable text area at the bottom for entering the actual word.

- **Ctrl+Click** (or **Cmd+Click** on Mac) on any tile to edit its text
- A dialog box will appear where you can type
- Press **Enter** to save or **Escape** to cancel

---

## Managing Your Diagram

### Moving Tiles

- **Drag** any tile to reposition it
- When you drag a parent tile, its entire subtree moves with it
- Unconnected tiles will snap to align with nearby tiles (blue guide lines appear)

### Removing Connections

- **Click on a connection line** to remove it (lines turn red when hovered)
- The tree will automatically reorganize

### Deleting Tiles

- **Select** a tile by double-clicking it
- Press **Delete** or **Backspace** to remove it
- All connections to/from that tile are also removed

---

## Navigation

### Zooming

- **Mouse wheel** - Zoom in/out centered on cursor
- **+ button** - Zoom in
- **- button** - Zoom out
- **Reset button** - Return to default zoom and position

### Panning

- **Click and drag** on empty canvas space to pan around

---

## Exporting Your Diagram

### Copy to Clipboard

Click **"copy tree"** to copy your diagram as a high-resolution PNG image. You can then paste it into:
- Documents (Word, Google Docs)
- Presentations (PowerPoint, Google Slides)
- Image editors
- Messages and emails

### Download as File

Click **"download tree"** to save your diagram as `grammar-tree.png`.

**Export Features:**
- Images are automatically cropped to fit your diagram
- High resolution (3x) for clear, sharp output
- White background for easy use in documents
- A green flash confirms successful export

---

## Tile Reference

### Clause Types

| Tile | Meaning |
|------|---------|
| S | Sentence |
| IC | Independent Clause |
| DC | Dependent Clause |
| RC | Relative Clause |
| CC | Complement Clause |

### Phrase Types

| Tile | Meaning | Color |
|------|---------|-------|
| NP | Noun Phrase | Pink |
| VP | Verb Phrase | Green |
| PP | Prepositional Phrase | Gray |
| ADJP | Adjective Phrase | Yellow |
| ADVP | Adverb Phrase | Blue |

### Parts of Speech (Open Class)

| Tile | Meaning | Color |
|------|---------|-------|
| NOUN | Noun | Red |
| VERB | Verb | Green |
| ADJ | Adjective | Yellow |
| ADV | Adverb | Blue |

### Parts of Speech (Closed Class)

| Tile | Meaning | Color |
|------|---------|-------|
| DET | Determiner | Orange |
| PRON | Pronoun | Dark Orange |
| PREP | Preposition | Gray |
| CONJ | Conjunction | Dark Gray |
| MOD | Modal | Purple |
| AUX | Auxiliary | Teal |
| INTJ | Interjection | Pink |
| REL | Relativizer | Purple |
| COMP | Complementizer | Dark Gray |

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Ctrl/Cmd + Click | Edit tile text |
| Delete / Backspace | Remove selected tile |
| Escape | Deselect / Cancel connection |

---

## Tips for Better Diagrams

1. **Start from the top** - Begin with the sentence (S) or main clause, then work down
2. **Use the auto-layout** - Connect tiles and let the app arrange them automatically
3. **Edit words last** - Build your structure first, then fill in the actual words
4. **Zoom out for overview** - Use zoom controls to see your full diagram
5. **Reset if lost** - Click "Reset" to return to the default view

---

## Troubleshooting

**Tiles won't connect:**
- Make sure you double-click (not single-click) both tiles
- Check that the first tile is highlighted blue before clicking the second

**Export not working:**
- Try the download button if copy doesn't work (some browsers restrict clipboard access)
- Make sure there are tiles on the canvas to export

**Diagram looks cluttered:**
- Connect tiles to trigger auto-layout
- Zoom out to see the full structure
- Remove unnecessary tiles

---

## Browser Compatibility

Works best in modern browsers:
- Google Chrome (recommended)
- Mozilla Firefox
- Microsoft Edge
- Safari

JavaScript must be enabled for the app to function.

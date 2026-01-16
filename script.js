// ===== Fabric setup =====
const canvas = new fabric.Canvas('diagram-canvas');
let idCounter = 0;

// connections: parentId -> [childGroupObjs...]
const connections = {};
// Optional: quick lookup (rebuilt on relayout)
let parentOf = {}; // childId -> parentId

let selectedTile = null;
let connectionPreviewLine = null;  // Preview line from selected tile to cursor

// ===== Snapping and smoothness settings =====
const SNAP_DISTANCE = 20;        // pixels for magnetic snap
const ANIMATION_DURATION = 150;  // ms for smooth transitions
const GRID_SNAP = false;         // set true for grid-based snapping

// --- keep Fabric canvas in sync with visible wrapper ---
function resizeCanvas() {
  const wrapper = document.getElementById('canvas-wrapper');
  if (!wrapper) return;
  const newWidth = Math.max(600, Math.floor(wrapper.clientWidth));
  const newHeight = Math.max(300, Math.floor(wrapper.clientHeight));
  canvas.setWidth(newWidth);
  canvas.setHeight(newHeight);
  canvas.calcOffset();
  canvas.requestRenderAll();
}

// ===== Smooth animation helper =====
function animateTileTo(tile, targetLeft, targetTop, duration = ANIMATION_DURATION) {
  return new Promise(resolve => {
    const startLeft = tile.left;
    const startTop = tile.top;
    const startTime = performance.now();

    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);

      tile.set({
        left: startLeft + (targetLeft - startLeft) * eased,
        top: startTop + (targetTop - startTop) * eased
      });
      tile.setCoords();
      canvas.requestRenderAll();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    }
    requestAnimationFrame(animate);
  });
}

// ===== Snap-to-grid and proximity snapping =====
function getSnapPosition(tile, ignoreId = null) {
  const tileCenter = tile.getCenterPoint();
  let snapX = null, snapY = null;

  // Get all other tiles for proximity snapping
  const otherTiles = canvas.getObjects().filter(o =>
    o.type === 'group' && o.customId && o.customId !== ignoreId && o.customId !== tile.customId
  );

  // Find nearest vertical alignment (center-to-center)
  otherTiles.forEach(other => {
    const otherCenter = other.getCenterPoint();
    const dx = Math.abs(tileCenter.x - otherCenter.x);
    const dy = Math.abs(tileCenter.y - otherCenter.y);

    // Horizontal alignment (snap centers vertically)
    if (dx < SNAP_DISTANCE && (snapX === null || dx < Math.abs(tileCenter.x - snapX))) {
      snapX = otherCenter.x;
    }
    // Vertical alignment (snap centers horizontally)
    if (dy < SNAP_DISTANCE && (snapY === null || dy < Math.abs(tileCenter.y - snapY))) {
      snapY = otherCenter.y;
    }
  });

  return { snapX, snapY };
}

function applySnap(tile) {
  const { snapX, snapY } = getSnapPosition(tile);
  const tileCenter = tile.getCenterPoint();
  const rect = tile.item(0);
  const halfW = (rect && rect.width) ? rect.width / 2 : 60;
  const halfH = tile.height / 2;

  if (snapX !== null) {
    tile.set({ left: snapX - halfW });
  }
  if (snapY !== null) {
    tile.set({ top: snapY - halfH });
  }
  tile.setCoords();
}

// ===== Connection preview system =====
function updateConnectionPreview(mouseX, mouseY) {
  if (!selectedTile) {
    removeConnectionPreview();
    return;
  }

  const selectedCenter = selectedTile.getCenterPoint();

  if (!connectionPreviewLine) {
    connectionPreviewLine = new fabric.Line(
      [selectedCenter.x, selectedCenter.y, mouseX, mouseY],
      {
        stroke: '#0066ff',
        strokeWidth: 2,
        strokeDashArray: [8, 4],
        selectable: false,
        evented: false,
        customType: 'preview-line',
        opacity: 0.7
      }
    );
    canvas.add(connectionPreviewLine);
    canvas.sendToBack(connectionPreviewLine);
  } else {
    connectionPreviewLine.set({
      x1: selectedCenter.x,
      y1: selectedCenter.y,
      x2: mouseX,
      y2: mouseY
    });
  }
  canvas.requestRenderAll();
}

function removeConnectionPreview() {
  if (connectionPreviewLine) {
    canvas.remove(connectionPreviewLine);
    connectionPreviewLine = null;
    canvas.requestRenderAll();
  }
}

// Highlight potential connection targets
function highlightConnectionTarget(tile, highlight) {
  if (!tile || tile === selectedTile) return;
  const rect = tile.item(0);
  if (highlight) {
    rect.set({
      stroke: '#00cc44',
      strokeWidth: 3,
      shadow: new fabric.Shadow({ color: '#00cc44', blur: 8, offsetX: 0, offsetY: 0 })
    });
  } else {
    // Restore normal state
    if (selectedTile !== tile) {
      rect.set({ stroke: '#333', strokeWidth: 2, shadow: null });
    }
  }
  canvas.requestRenderAll();
}

// Track hovered tile for connection highlighting
let hoveredTile = null;

// ===== Zoom / pan =====
canvas.on('mouse:wheel', function(opt) {
  var delta = opt.e.deltaY;
  var zoom = canvas.getZoom();
  zoom *= 0.999 ** delta;
  if (zoom > 20) zoom = 20;
  if (zoom < 0.01) zoom = 0.01;
  canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
  opt.e.preventDefault();
  opt.e.stopPropagation();
});

canvas.on('mouse:down', function(opt) {
  var evt = opt.e;
  if ((evt.ctrlKey || evt.metaKey) && opt.target && opt.target.isEditable) {
    evt.preventDefault();
    evt.stopPropagation();
    editTile(opt.target);
    return;
  }
  if (!opt.target) {
    if (selectedTile) {
      setTileSelected(selectedTile, false);
      selectedTile = null;
      removeConnectionPreview();
      if (hoveredTile) {
        highlightConnectionTarget(hoveredTile, false);
        hoveredTile = null;
      }
    }
    this.isDragging = true;
    this.selection = false;
    this.lastPosX = evt.clientX;
    this.lastPosY = evt.clientY;
  }
});

canvas.on('mouse:move', function(opt) {
  if (this.isDragging) {
    var e = opt.e;
    var vpt = this.viewportTransform;
    vpt[4] += e.clientX - this.lastPosX;
    vpt[5] += e.clientY - this.lastPosY;
    this.requestRenderAll();
    this.lastPosX = e.clientX;
    this.lastPosY = e.clientY;
  }

  // Update connection preview line if a tile is selected
  if (selectedTile && !this.isDragging) {
    const pointer = canvas.getPointer(opt.e);
    updateConnectionPreview(pointer.x, pointer.y);

    // Highlight tile under cursor as potential connection target
    const target = opt.target;
    if (target && target.type === 'group' && target.customId && target !== selectedTile) {
      if (hoveredTile && hoveredTile !== target) {
        highlightConnectionTarget(hoveredTile, false);
      }
      hoveredTile = target;
      highlightConnectionTarget(hoveredTile, true);
    } else if (hoveredTile) {
      highlightConnectionTarget(hoveredTile, false);
      hoveredTile = null;
    }
  }
});

canvas.on('mouse:up', function() {
  this.setViewportTransform(this.viewportTransform);
  this.isDragging = false;
  this.selection = true;
});

// ===== Color map =====
const posColors = {
  noun: '#E74C3C',
  verb: '#27AE60',
  adjective: '#F1C40F',
  adverb: '#3498DB',
  preposition: '#95A5A6',
  conjunction: '#34495E',
  pronoun: '#E67E22',
  interjection: '#E91E63',
  relativizer: '#9B59B6',
  complementizer: '#2C3E50',
  determiner: '#F39C12',
  modal: '#8E44AD',
  auxiliary: '#16A085'
};

// ===== Tile creation =====
function createTile(text, color, editable = false) {
  const rect = new fabric.Rect({
    width: 120, height: 40, fill: color, rx: 10, ry: 10,
    stroke: '#333', strokeWidth: 2, originX: 'center', originY: 'center'
  });

  const displayText = editable && text === 'type here' ? 'ctrl + click to type' : text;
  const label = new fabric.Text(displayText, {
    fontSize: editable && text === 'type here' ? 10 : 14,
    fill: '#000', textAlign: 'center', originX: 'center', originY: 'center',
    fontFamily: 'Arial, sans-serif', textBaseline: 'middle'
  });

  const group = new fabric.Group([rect, label], {
    left: 100 + idCounter * 10, top: 50 + idCounter * 10,
    hasControls: false, lockScalingX: true, lockScalingY: true
  });

  group.customId = `tile-${idCounter++}`;
  group.isEditable = editable;
  group.editTargetIndex = 1; // editable text index for standard tiles
  setupTileEvents(group);
  canvas.add(group);
  return group;
}

// Two-part word tile (double height with POS code + divider + editable word)
function createWordTile(posCode, color) {
  const WIDTH = 120, HEIGHT = 80;
  const rect = new fabric.Rect({
    width: WIDTH, height: HEIGHT, fill: color, rx: 10, ry: 10,
    stroke: '#333', strokeWidth: 2, originX: 'center', originY: 'center'
  });

  const posText = new fabric.Text(posCode.toUpperCase(), {
    fontSize: 14, fill: '#fff', originX: 'center', originY: 'center',
    top: -HEIGHT / 4, left: 0, fontFamily: 'Arial, sans-serif'
  });

  const divider = new fabric.Line([-WIDTH/2 + 8, 0, WIDTH/2 - 8, 0], {
    stroke: '#333', strokeWidth: 2, selectable: false, evented: false,
    originX: 'center', originY: 'center'
  });

  const wordText = new fabric.Text('ctrl + click to type', {
    fontSize: 10, fill: '#000', originX: 'center', originY: 'center',
    top: HEIGHT / 4, left: 0, fontFamily: 'Arial, sans-serif'
  });

  const group = new fabric.Group([rect, posText, divider, wordText], {
    left: 100 + idCounter * 10, top: 50 + idCounter * 10,
    hasControls: false, lockScalingX: true, lockScalingY: true
  });

  group.customId = `tile-${idCounter++}`;
  group.isEditable = true;
  group.editTargetIndex = 3; // editable area is the bottom text
  group.meta = { kind: 'word', pos: posCode.toLowerCase() };

  setupTileEvents(group);
  canvas.add(group);
  return group;
}

// ===== Tile events =====
function setupTileEvents(tile) {
  let lastPosition = { x: 0, y: 0 };
  let isDragging = false;
  let snapGuides = [];

  // Show snap guides during drag
  function showSnapGuides(tile) {
    clearSnapGuides();
    const { snapX, snapY } = getSnapPosition(tile);
    const tileCenter = tile.getCenterPoint();

    if (snapX !== null) {
      const vLine = new fabric.Line([snapX, 0, snapX, canvas.getHeight()], {
        stroke: '#0066ff', strokeWidth: 1, strokeDashArray: [5, 5],
        selectable: false, evented: false, customType: 'snap-guide', opacity: 0.6
      });
      snapGuides.push(vLine);
      canvas.add(vLine);
    }
    if (snapY !== null) {
      const hLine = new fabric.Line([0, snapY, canvas.getWidth(), snapY], {
        stroke: '#0066ff', strokeWidth: 1, strokeDashArray: [5, 5],
        selectable: false, evented: false, customType: 'snap-guide', opacity: 0.6
      });
      snapGuides.push(hLine);
      canvas.add(hLine);
    }
  }

  function clearSnapGuides() {
    snapGuides.forEach(g => canvas.remove(g));
    snapGuides = [];
  }

  tile.on('moving', () => {
    isDragging = true;
    const currentPos = { x: tile.left, y: tile.top };
    const deltaX = currentPos.x - lastPosition.x;
    const deltaY = currentPos.y - lastPosition.y;
    moveSubtree(tile, deltaX, deltaY);
    lastPosition = currentPos;
    updateConnections();

    // Show snap guides while dragging (only for unconnected or root tiles)
    if (!parentOf[tile.customId]) {
      showSnapGuides(tile);
    }
  });

  tile.on('mousedown', (e) => {
    lastPosition = { x: tile.left, y: tile.top };
    isDragging = false;
    e.e.stopPropagation();

    // Add subtle lift effect
    tile.set({ shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.3)', blur: 12, offsetX: 4, offsetY: 4 }) });
    canvas.requestRenderAll();
  });

  tile.on('mouseup', () => {
    clearSnapGuides();

    // Remove lift effect
    if (selectedTile !== tile) {
      tile.set({ shadow: null });
      tile.item(0).set({ shadow: null });
    }

    // Apply snap on drop (only for unconnected tiles)
    if (isDragging && !parentOf[tile.customId]) {
      applySnap(tile);
      updateConnections();
    }
    isDragging = false;
    canvas.requestRenderAll();
  });

  tile.on('mousedblclick', (e) => {
    e.e.stopPropagation();
    handleTileDoubleClick(tile);
  });

  // Hover effect for tiles - subtle scale and shadow
  tile.on('mouseover', () => {
    if (selectedTile !== tile && !isDragging) {
      tile.set({
        scaleX: 1.02,
        scaleY: 1.02,
        shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.15)', blur: 8, offsetX: 2, offsetY: 2 })
      });
      canvas.requestRenderAll();
    }
  });

  tile.on('mouseout', () => {
    if (selectedTile !== tile && !isDragging) {
      tile.set({
        scaleX: 1,
        scaleY: 1,
        shadow: null
      });
      canvas.requestRenderAll();
    }
  });
}

function handleTileDoubleClick(tile) {
  if (!selectedTile) {
    selectedTile = tile;
    setTileSelected(tile, true);
  } else if (selectedTile === tile) {
    setTileSelected(tile, false);
    selectedTile = null;
    removeConnectionPreview();
    if (hoveredTile) {
      highlightConnectionTarget(hoveredTile, false);
      hoveredTile = null;
    }
  } else {
    // parent is the higher tile
    const parent = (selectedTile.top < tile.top) ? selectedTile : tile;
    const child  = (parent === selectedTile) ? tile : selectedTile;

    // Clean up visuals before connecting
    removeConnectionPreview();
    if (hoveredTile) {
      highlightConnectionTarget(hoveredTile, false);
      hoveredTile = null;
    }

    connectTiles(parent, child);   // includes sibling order by x + relayoutAll
    setTileSelected(selectedTile, false);
    selectedTile = null;
  }
}

function setTileSelected(tile, isSelected) {
  const rect = tile.item(0);
  if (isSelected) {
    rect.set({
      stroke: '#0066ff', strokeWidth: 5,
      shadow: new fabric.Shadow({ color: '#0066ff', blur: 10, offsetX: 0, offsetY: 0 })
    });
  } else {
    rect.set({ stroke: '#333', strokeWidth: 2, shadow: null });
  }
  canvas.requestRenderAll();
}

function editTile(tile) {
  const textObj = (typeof tile.editTargetIndex === 'number')
    ? tile.item(tile.editTargetIndex)
    : tile.item(1);

  const currentText = textObj.text;
  const inputText = (currentText === 'ctrl + click to type' || currentText === 'type here') ? '' : currentText;

  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.5);
    display: flex; align-items: center; justify-content: center; z-index: 10000;
  `;
  const inputContainer = document.createElement('div');
  inputContainer.style.cssText = `
    background: white; padding: 20px; border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  const label = document.createElement('div');
  label.textContent = 'Edit text:';
  label.style.marginBottom = '10px';

  const input = document.createElement('input');
  input.type = 'text';
  input.value = inputText;
  input.style.cssText = `width: 240px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;`;

  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `margin-top: 10px; text-align: right;`;

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.cssText = `margin-right: 10px; padding: 6px 12px; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer;`;

  const okBtn = document.createElement('button');
  okBtn.textContent = 'OK';
  okBtn.style.cssText = `padding: 6px 12px; border: 1px solid #007bff; background: #007bff; color: white; border-radius: 4px; cursor: pointer;`;

  buttonContainer.appendChild(cancelBtn);
  buttonContainer.appendChild(okBtn);
  inputContainer.appendChild(label);
  inputContainer.appendChild(input);
  inputContainer.appendChild(buttonContainer);
  overlay.appendChild(inputContainer);
  document.body.appendChild(overlay);

  input.focus(); input.select();

  function closeDialog(save) {
    document.body.removeChild(overlay);
    if (save) {
      const finalText = input.value || 'ctrl + click to type';
      textObj.set({ text: finalText, fontSize: (finalText === 'ctrl + click to type') ? 10 : 14 });
      if (selectedTile === tile) { setTileSelected(tile, false); selectedTile = null; }
      canvas.requestRenderAll();
    }
  }

  okBtn.addEventListener('click', () => closeDialog(true));
  cancelBtn.addEventListener('click', () => closeDialog(false));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') closeDialog(true);
    else if (e.key === 'Escape') closeDialog(false);
  });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeDialog(false); });
}

// ===== Tree structure helpers =====
function moveSubtree(parentTile, dx, dy) {
  const kids = connections[parentTile.customId];
  if (!kids || kids.length === 0) return;
  kids.forEach(child => {
    child.set({ left: child.left + dx, top: child.top + dy });
    child.setCoords();
    moveSubtree(child, dx, dy);
  });
}

function removeConnection(parent, child) {
  const pid = parent.customId;
  if (!connections[pid]) return;
  connections[pid] = connections[pid].filter(c => c !== child);
  if (connections[pid].length === 0) delete connections[pid];
  // full relayout after structural change
  relayoutAll();
}

function connectTiles(parentTile, childTile) {
  const pid = parentTile.customId, cid = childTile.customId;

  // Detach from previous parent (if any)
  Object.entries(connections).forEach(([existingPid, arr]) => {
    if (arr.includes(childTile)) {
      connections[existingPid] = arr.filter(c => c !== childTile);
      if (connections[existingPid].length === 0) delete connections[existingPid];
    }
  });

  if (!connections[pid]) connections[pid] = [];

  // Insert child according to current horizontal position among siblings.
  // We consider centers so "between two" stays between them.
  const withNew = [...connections[pid], childTile];
  const centerX = (obj) => obj.getCenterPoint().x;
  withNew.sort((a, b) => centerX(a) - centerX(b));
  connections[pid] = withNew;

  // Full relayout after structural change
  relayoutAll();
}

// ===== Global auto-layout (tidy-ish)
function relayoutAll() {
  // Rebuild parentOf map from connections
  parentOf = {};
  Object.entries(connections).forEach(([pid, arr]) => {
    arr.forEach(ch => { parentOf[ch.customId] = pid; });
  });

  // Collect all nodes that are part of the tree (either a parent or a child)
  const graphIds = new Set();
  Object.keys(connections).forEach(pid => graphIds.add(pid));
  Object.values(connections).forEach(arr => arr.forEach(ch => graphIds.add(ch.customId)));

  // Build node map (id -> group)
  const nodes = {};
  canvas.getObjects().forEach(o => {
    if (o.type === 'group' && graphIds.has(o.customId)) nodes[o.customId] = o;
  });

  if (Object.keys(nodes).length === 0) {
    updateConnections();
    canvas.requestRenderAll();
    return;
  }

  // Roots = graph nodes with no parent
  const roots = [];
  graphIds.forEach(id => { if (!parentOf[id]) roots.push(id); });

  // Compute subtree "span" in units for each node (at least 1)
  const spans = new Map();
  function computeSpan(id) {
    const kids = (connections[id] || []).map(ch => ch.customId).filter(k => graphIds.has(k));
    if (kids.length === 0) { spans.set(id, 1); return 1; }
    let sum = 0;
    kids.forEach(k => sum += computeSpan(k));
    sum = Math.max(1, sum);
    spans.set(id, sum);
    return sum;
  }
  roots.forEach(r => computeSpan(r));

  // Visual constants
  const UNIT_W = 140;       // horizontal unit per "slot"
  const LEVEL_H = 110;      // vertical distance between levels
  const TOP_MARGIN = 20;
  const ROOT_GAP_UNITS = 1; // gap between separate roots

  // Keep root order stable and intuitive: by current screen X
  roots.sort((a, b) => nodes[a].getCenterPoint().x - nodes[b].getCenterPoint().x);

  // Compute total width to center the forest
  let totalUnits = 0;
  roots.forEach((r, i) => {
    totalUnits += spans.get(r);
    if (i < roots.length - 1) totalUnits += ROOT_GAP_UNITS;
  });
  const totalPx = totalUnits * UNIT_W;
  const startX = Math.max(20, (canvas.getWidth() - totalPx) / 2);

  // Collect target positions for animated transition
  const targetPositions = new Map();

  function computeTargetPosition(tile, centerX, topY) {
    const rect = tile.item(0);
    const halfW = (rect && rect.width) ? rect.width / 2 : 60;
    return { left: centerX - halfW, top: topY };
  }

  function assignTargets(id, leftPx, depth) {
    const tile = nodes[id];
    const spanUnits = spans.get(id) || 1;
    const centerX = leftPx + (spanUnits * UNIT_W) / 2;
    const y = TOP_MARGIN + depth * LEVEL_H;

    targetPositions.set(id, computeTargetPosition(tile, centerX, y));

    const kids = connections[id] ? connections[id].slice() : [];
    let childLeftPx = leftPx;
    kids.forEach(ch => {
      const cid = ch.customId;
      const cSpan = spans.get(cid) || 1;
      assignTargets(cid, childLeftPx, depth + 1);
      childLeftPx += cSpan * UNIT_W;
    });
  }

  let cursorUnits = 0;
  roots.forEach((r, i) => {
    const leftPx = startX + cursorUnits * UNIT_W;
    assignTargets(r, leftPx, 0);
    cursorUnits += spans.get(r) + (i < roots.length - 1 ? ROOT_GAP_UNITS : 0);
  });

  // Animate all tiles to their target positions
  const duration = ANIMATION_DURATION;
  const startTime = performance.now();
  const startPositions = new Map();

  // Store start positions
  targetPositions.forEach((target, id) => {
    const tile = nodes[id];
    startPositions.set(id, { left: tile.left, top: tile.top });
  });

  function animateRelayout(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);

    targetPositions.forEach((target, id) => {
      const tile = nodes[id];
      const start = startPositions.get(id);
      tile.set({
        left: start.left + (target.left - start.left) * eased,
        top: start.top + (target.top - start.top) * eased
      });
      tile.setCoords();
    });

    updateConnections();
    canvas.requestRenderAll();

    if (progress < 1) {
      requestAnimationFrame(animateRelayout);
    }
  }

  requestAnimationFrame(animateRelayout);
}

// ===== Lines =====
function updateConnections() {
  // remove old connection lines
  const lines = canvas.getObjects('line').filter(l => l.customType === 'connection-line');
  lines.forEach(line => canvas.remove(line));

  Object.entries(connections).forEach(([pid, children]) => {
    const parent = canvas.getObjects().find(o => o.customId === pid);
    if (!parent) return;
    const pC = parent.getCenterPoint();
    children.forEach(child => {
      const cC = child.getCenterPoint();
      const line = new fabric.Line([pC.x, pC.y, cC.x, cC.y], {
        stroke: '#333', strokeWidth: 2, selectable: false, evented: true, customType: 'connection-line',
        hoverCursor: 'pointer'
      });

      // Click to remove connection
      line.on('mousedown', (e) => {
        e.e.stopPropagation();
        removeConnection(parent, child);
      });

      // Hover effect on lines - show they're clickable
      line.on('mouseover', () => {
        line.set({ stroke: '#cc0000', strokeWidth: 3 });
        canvas.requestRenderAll();
      });
      line.on('mouseout', () => {
        line.set({ stroke: '#333', strokeWidth: 2 });
        canvas.requestRenderAll();
      });

      canvas.add(line);
      canvas.sendToBack(line);
    });
  });
}

// ===== Keyboard =====
document.addEventListener('keydown', function(e) {
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (selectedTile) deleteTile(selectedTile);
  }
  if (e.key === 'Escape') {
    if (selectedTile) {
      setTileSelected(selectedTile, false);
      selectedTile = null;
      removeConnectionPreview();
      if (hoveredTile) {
        highlightConnectionTarget(hoveredTile, false);
        hoveredTile = null;
      }
    }
  }
});

function deleteTile(tile) {
  const tid = tile.customId;
  if (!tid) return;

  // remove as parent
  if (connections[tid]) delete connections[tid];

  // remove from any parent's children
  Object.entries(connections).forEach(([pid, arr]) => {
    const idx = arr.indexOf(tile);
    if (idx > -1) arr.splice(idx, 1);
    if (arr.length === 0) delete connections[pid];
  });

  canvas.remove(tile);
  if (selectedTile === tile) selectedTile = null;

  // relayout after structural change
  relayoutAll();
}

// ===== Drag & drop from palettes =====
document.addEventListener('DOMContentLoaded', function() {
  // sync size now & on resize
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // palette drag helpers
  document.querySelectorAll('.palette-tile').forEach(tile => {
    tile.addEventListener('dragstart', function(e) {
      const data = { type: this.getAttribute('data-type'), value: this.getAttribute('data-value') };
      e.dataTransfer.setData('text/plain', JSON.stringify(data));
      e.dataTransfer.effectAllowed = 'copy';
    });
  });

  const canvasElement = canvas.upperCanvasEl;
  if (canvasElement) {
    canvasElement.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });
    canvasElement.addEventListener('drop', function(e) {
      e.preventDefault();
      canvasElement.classList.remove('drag-over');
      const data = e.dataTransfer.getData('text/plain');
      if (!data) return;
      try {
        const dropData = JSON.parse(data);
        const rect = canvasElement.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        let tile;
        if (dropData.type === 'word') {
          const color = posColors[dropData.value] || '#ccc';
          tile = createWordTile(dropData.value.toUpperCase(), color);
        } else if (dropData.type === 'phrase') {
          const phraseColors = { NP: '#F1948A', VP: '#58D68D', PP: '#BDC3C7', ADJP: '#F7DC6F', ADVP: '#85C1E9' };
          const color = phraseColors[dropData.value] || '#ccc';
          tile = createTile(dropData.value, color);
        } else if (dropData.type === 'clause') {
          tile = createTile(dropData.value, '#ffffff');
        }

        if (tile) {
          const baseRect = tile.item(0);
          const halfW = (baseRect && baseRect.width) ? baseRect.width / 2 : 60;
          const targetLeft = x - halfW;
          const targetTop = y - (tile.height || 40) / 2;

          // Start with a drop animation - tile appears slightly above and fades/slides in
          tile.set({
            left: targetLeft,
            top: targetTop - 20,
            opacity: 0.3
          });
          tile.setCoords();
          canvas.requestRenderAll();

          // Animate tile dropping into place
          const startTime = performance.now();
          const duration = 120;
          function animateDrop(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 2);

            tile.set({
              top: (targetTop - 20) + 20 * eased,
              opacity: 0.3 + 0.7 * eased
            });
            tile.setCoords();
            canvas.requestRenderAll();

            if (progress < 1) {
              requestAnimationFrame(animateDrop);
            }
          }
          requestAnimationFrame(animateDrop);
        }
      } catch (error) {
        console.error('Error parsing drop data:', error);
      }
    });

    // Visual feedback when dragging over canvas
    canvasElement.addEventListener('dragenter', function(e) {
      canvasElement.classList.add('drag-over');
    });
    canvasElement.addEventListener('dragleave', function(e) {
      canvasElement.classList.remove('drag-over');
    });
  }

  // Zoom buttons
  document.getElementById('zoom-in').addEventListener('click', () => {
    canvas.setZoom(Math.min(canvas.getZoom() * 1.2, 20));
  });
  document.getElementById('zoom-out').addEventListener('click', () => {
    canvas.setZoom(Math.max(canvas.getZoom() * 0.8, 0.01));
  });
  document.getElementById('zoom-reset').addEventListener('click', () => {
    canvas.setZoom(1);
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  });

  // ===== Export helpers (tight-crop) =====
  const statusEl = document.getElementById('export-status');
  const setStatus = (msg) => { statusEl.textContent = msg || ''; };

  function withWhiteBackground(fn) {
    const prevBg = canvas.backgroundColor;
    canvas.backgroundColor = '#ffffff';
    canvas.requestRenderAll();
    const result = fn();
    if (result && typeof result.then === 'function') {
      return result.finally(() => {
        canvas.backgroundColor = prevBg || null;
        canvas.requestRenderAll();
      });
    } else {
      canvas.backgroundColor = prevBg || null;
      canvas.requestRenderAll();
      return result;
    }
  }

  function getTightBounds() {
    // Filter to only get diagram objects (groups and connection lines, not preview/snap guides)
    const objs = canvas.getObjects().filter(o =>
      o.visible &&
      (o.type === 'group' || (o.type === 'line' && o.customType === 'connection-line'))
    );

    if (objs.length === 0) {
      return { left: 0, top: 0, width: canvas.getWidth(), height: canvas.getHeight() };
    }
    objs.forEach(o => o.setCoords());

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    objs.forEach(o => {
      const ac = o.aCoords || o.calcCoords();
      const xs = [ac.tl.x, ac.tr.x, ac.bl.x, ac.br.x];
      const ys = [ac.tl.y, ac.tr.y, ac.bl.y, ac.br.y];
      minX = Math.min(minX, ...xs);
      maxX = Math.max(maxX, ...xs);
      minY = Math.min(minY, ...ys);
      maxY = Math.max(maxY, ...ys);
    });

    const width = Math.max(1, maxX - minX);
    const height = Math.max(1, maxY - minY);
    // Generous padding for better image framing
    const padX = Math.max(30, width * 0.10);
    const padY = Math.max(30, height * 0.10);

    let left = Math.floor(minX - padX);
    let top = Math.floor(minY - padY);
    let w = Math.ceil(width + padX * 2);
    let h = Math.ceil(height + padY * 2);

    left = Math.max(0, left);
    top = Math.max(0, top);
    w = Math.min(canvas.getWidth() - left, w);
    h = Math.min(canvas.getHeight() - top, h);

    return { left, top, width: w, height: h };
  }

  // Visual feedback flash when export succeeds
  function flashExportSuccess() {
    const wrapper = document.getElementById('canvas-wrapper');
    wrapper.style.transition = 'box-shadow 0.2s ease';
    wrapper.style.boxShadow = '0 0 20px 5px rgba(0, 200, 100, 0.5)';
    setTimeout(() => {
      wrapper.style.boxShadow = '';
    }, 300);
  }

  function loadImage(dataURL) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = dataURL;
    });
  }

  async function makeCroppedGifBlob(bounds, multiplier = 2) {
    const dataURL = canvas.toDataURL({
      format: 'png',
      left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height, multiplier
    });
    const img = await loadImage(dataURL);
    return new Promise((resolve, reject) => {
      try {
        const gif = new GIF({
          workers: 2, quality: 10, width: img.width, height: img.height,
          workerScript: 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js'
        });
        gif.addFrame(img, { delay: 200, copy: true });
        gif.on('finished', (blob) => resolve(blob));
        gif.on('abort', () => reject(new Error('GIF encoding aborted.')));
        gif.render();
      } catch (e) { reject(e); }
    });
  }

  async function makeCroppedPngBlob(bounds, multiplier = 2) {
    const dataURL = canvas.toDataURL({
      format: 'png',
      left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height, multiplier
    });
    const res = await fetch(dataURL);
    return await res.blob();
  }

  // COPY (cropped PNG - high quality, widely supported)
  document.getElementById('copy-tree').addEventListener('click', async () => {
    try {
      const bounds = getTightBounds();
      setStatus('Copying to clipboard…');

      // Use PNG directly for better quality and faster processing
      const pngBlob = await withWhiteBackground(() => makeCroppedPngBlob(bounds, 3));
      const pngItem = new ClipboardItem({ 'image/png': pngBlob });
      await navigator.clipboard.write([pngItem]);

      flashExportSuccess();
      setStatus('Copied to clipboard ✓');
    } catch (err) {
      // Fallback: open in new tab
      try {
        setStatus('Opening image in new tab…');
        const bounds = getTightBounds();
        const dataURL = await withWhiteBackground(() => canvas.toDataURL({
          format: 'png',
          left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height, multiplier: 3
        }));
        window.open(dataURL, '_blank');
        setStatus('Image opened in new tab');
      } catch (e2) {
        setStatus('Export failed');
        console.error(e2);
      }
    }
    setTimeout(() => setStatus(''), 2500);
  });

  // DOWNLOAD (high-quality cropped PNG)
  document.getElementById('download-tree').addEventListener('click', async () => {
    try {
      setStatus('Preparing download…');
      const bounds = getTightBounds();

      // Use PNG for maximum quality and compatibility
      const pngBlob = await withWhiteBackground(() => makeCroppedPngBlob(bounds, 3));
      const url = URL.createObjectURL(pngBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'grammar-tree.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      flashExportSuccess();
      setStatus('Downloaded ✓');
      setTimeout(() => setStatus(''), 2500);
    } catch (e) {
      console.error(e);
      // Fallback using dataURL directly
      try {
        const bounds = getTightBounds();
        const dataURL = await withWhiteBackground(() => canvas.toDataURL({
          format: 'png',
          left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height, multiplier: 3
        }));
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = 'grammar-tree.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setStatus('Downloaded ✓');
      } catch (e2) {
        setStatus('Download failed');
      }
      setTimeout(() => setStatus(''), 2500);
    }
  });
});

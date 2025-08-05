const canvas = new fabric.Canvas('diagram-canvas');
let idCounter = 0;
const connections = {};

// Color mapping for different parts of speech
const posColors = {
  // WARM COLORS - Noun-related elements (reds, yellows, oranges)
  noun: '#E74C3C',           // Red
  determiner: '#F39C12',     // Orange
  adjective: '#F1C40F',      // Yellow
  pronoun: '#E67E22',        // Dark orange
  
  // COOL COLORS - Verb-related elements (greens, blues, purples)
  verb: '#27AE60',           // Green
  adverb: '#3498DB',         // Blue
  modal: '#8E44AD',          // Purple
  auxiliary: '#16A085',      // Teal
  
  // NEUTRAL - Function words
  preposition: '#95A5A6',    // Gray
  conjunction: '#34495E',    // Dark gray
  interjection: '#E91E63',   // Pink
  relativizer: '#9B59B6',    // Light purple
  complementizer: '#2C3E50'  // Dark blue-gray
};

// Colors for structural elements - phrases match their headwords but lighter
const structureColors = {
  clause: '#FFFFFF',         // White (changed from gray)
  phrase: '#FFFFFF',         // Default white, will be overridden based on type
  
  // Phrase colors (lighter versions of their headwords)
  'NP': '#F1948A',          // Light red (lighter noun)
  'VP': '#58D68D',          // Light green (lighter verb)
  'PP': '#BDC3C7',          // Light gray (preposition-based)
  'ADJP': '#F7DC6F',        // Light yellow (lighter adjective)
  'ADVP': '#85C1E9'         // Light blue (lighter adverb)
};

function createTile(text, color, editable = false, partOfSpeech = null) {
  const rect = new fabric.Rect({
    width: 120,
    height: editable ? 60 : 50, // Taller for word boxes
    fill: color,
    rx: 8,
    ry: 8,
    stroke: color === '#FFFFFF' ? '#333' : 'rgba(0,0,0,0.2)',
    strokeWidth: color === '#FFFFFF' ? 2 : 1
  });

  let label;
  
  if (editable && partOfSpeech) {
    // Create two-row layout for word boxes
    const posLabel = new fabric.Text(partOfSpeech.toUpperCase(), {
      fontSize: 12,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      fill: color === '#FFFFFF' ? '#333' : '#000',
      textAlign: 'center'
    });
    
    const wordLabel = new fabric.Text('Ctrl+Click', {
      fontSize: 14,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'normal',
      fill: color === '#FFFFFF' ? '#666' : '#333',
      textAlign: 'center',
      fontStyle: 'italic'
    });
    
    // Position the labels
    posLabel.set({
      left: rect.width / 2,
      top: 15,
      originX: 'center',
      originY: 'center'
    });
    
    wordLabel.set({
      left: rect.width / 2,
      top: 40,
      originX: 'center',
      originY: 'center'
    });
    
    label = new fabric.Group([posLabel, wordLabel]);
  } else {
    // Single label for phrases and clauses
    label = new fabric.Text(text, {
      fontSize: 16,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      fill: color === '#FFFFFF' ? '#333' : '#000',
      textAlign: 'center'
    });

    // Center the text within the rectangle
    label.set({
      left: rect.width / 2,
      top: rect.height / 2,
      originX: 'center',
      originY: 'center'
    });
  }

  const group = new fabric.Group([rect, label], {
    left: 100 + idCounter * 10,
    top: 50 + idCounter * 10,
    hasControls: false,
    lockScalingX: true,
    lockScalingY: true
  });

  group.customId = `tile-${idCounter++}`;
  group.isEditable = editable;
  group.partOfSpeech = partOfSpeech; // Store the part of speech
  
  // Add event handlers
  group.on('moving', () => {
    moveChildrenWithParent(group);
    updateConnections();
    handleChildReordering(group);
  });

  group.on('mouseup', () => {
    finalizeChildReordering(group);
    // Ensure children follow after any position changes
    moveChildrenWithParent(group);
    updateConnections();
  });

  // Handle double left-click for connection pairing (all tiles)
  group.on('mousedblclick', (e) => {
    if (e.e.button === 0) { // Left double-click
      handleTileDoubleClick(group);
    }
  });

  // Handle Ctrl+left click for editing editable tiles
  if (editable) {
    group.on('mousedown', (e) => {
      if (e.e.button === 0 && e.e.ctrlKey) { // Ctrl+left click
        e.e.preventDefault(); // Prevent any default behavior
        editTile(group);
      }
    });
  }

  canvas.add(group);
  return group;
}

let selectedTile = null;

function handleTileDoubleClick(tile) {
  if (!selectedTile) {
    // First tile selected - highlight it
    selectedTile = tile;
    tile.item(0).set({ stroke: '#FF4444', strokeWidth: 4 });
    canvas.requestRenderAll();
  } else if (selectedTile === tile) {
    // Same tile clicked - deselect
    tile.item(0).set({ 
      stroke: tile.item(0).fill === '#FFFFFF' ? '#333' : 'rgba(0,0,0,0.2)', 
      strokeWidth: tile.item(0).fill === '#FFFFFF' ? 2 : 1 
    });
    selectedTile = null;
    canvas.requestRenderAll();
  } else {
    // Two different tiles - connect them
    connectTiles(selectedTile, tile);
    // Reset both tiles' appearance
    selectedTile.item(0).set({ 
      stroke: selectedTile.item(0).fill === '#FFFFFF' ? '#333' : 'rgba(0,0,0,0.2)', 
      strokeWidth: selectedTile.item(0).fill === '#FFFFFF' ? 2 : 1 
    });
    selectedTile = null;
    canvas.requestRenderAll();
  }
}

// Remove the old handleTileClick function

function editTile(tile) {
  const isWordBox = tile.isEditable && tile.partOfSpeech;
  
  if (isWordBox) {
    // For word boxes, edit the bottom text
    const labelGroup = tile.item(1);
    const wordLabel = labelGroup.item(1); // Second item is the word text
    const currentText = wordLabel.text;
    
    const newText = prompt('Enter word:', currentText === 'Ctrl+Click' ? '' : currentText);
    if (newText !== null) {
      wordLabel.set({
        text: newText || 'Ctrl+Click',
        fontStyle: newText ? 'normal' : 'italic',
        fill: newText ? (tile.item(0).fill === '#FFFFFF' ? '#333' : '#000') : (tile.item(0).fill === '#FFFFFF' ? '#666' : '#333')
      });
      canvas.requestRenderAll();
      
      // Deselect the tile after editing
      if (selectedTile === tile) {
        tile.item(0).set({ 
          stroke: tile.item(0).fill === '#FFFFFF' ? '#333' : 'rgba(0,0,0,0.2)', 
          strokeWidth: tile.item(0).fill === '#FFFFFF' ? 2 : 1 
        });
        selectedTile = null;
        canvas.requestRenderAll();
      }
    }
  } else {
    // For regular tiles, edit the main text
    const textObj = tile.item(1);
    const currentText = textObj.text;
    
    const newText = prompt('Edit text:', currentText === 'type here' ? '' : currentText);
    if (newText !== null) {
      textObj.set('text', newText || 'type here');
      canvas.requestRenderAll();
    }
  }
}

function connectTiles(tile1, tile2) {
  // Determine parent and child based on vertical position (lowest = child)
  const parent = tile1.top <= tile2.top ? tile1 : tile2;
  const child = tile1.top <= tile2.top ? tile2 : tile1;
  
  const parentId = parent.customId;
  
  if (!connections[parentId]) {
    connections[parentId] = [];
  }
  
  // Avoid duplicate connections and limit to 6 children
  if (!connections[parentId].includes(child) && connections[parentId].length < 6) {
    connections[parentId].push(child);
    layoutChildren(parent);
    updateConnections();
  }
}

function moveChildrenWithParent(parentTile) {
  const children = connections[parentTile.customId];
  if (!children || children.length === 0) return;

  // Calculate the offset from the parent's expected child layout
  const spacing = 140;
  const count = children.length;
  const totalWidth = spacing * (count - 1);
  const expectedStartX = parentTile.left - totalWidth / 2;
  const expectedY = parentTile.top + 100;

  // Move each child to maintain relative positioning
  children.forEach((child, i) => {
    const expectedX = expectedStartX + i * spacing;
    child.set({
      left: expectedX,
      top: expectedY
    });
    child.setCoords();
    
    // Recursively move any children of this child
    moveChildrenWithParent(child);
  });
}

function layoutChildren(parent) {
  const children = connections[parent.customId];
  if (!children || children.length === 0) return;

  const spacing = 140;
  const count = children.length;
  const totalWidth = spacing * (count - 1);
  const startX = parent.left - totalWidth / 2;
  const y = parent.top + 100;

  children.forEach((child, i) => {
    child.set({
      left: startX + i * spacing,
      top: y
    });
    child.setCoords();
    
    // Recursively layout and move children of this child
    layoutChildren(child);
    moveChildrenWithParent(child);
  });
}

function handleChildReordering(draggedTile) {
  // Find if this tile is a child of any parent
  let parentTile = null;
  let parentId = null;
  
  for (const [id, children] of Object.entries(connections)) {
    if (children.includes(draggedTile)) {
      parentId = id;
      parentTile = canvas.getObjects().find(obj => obj.customId === id);
      break;
    }
  }
  
  if (!parentTile) return; // Not a child of anyone
  
  const children = connections[parentId];
  const draggedIndex = children.indexOf(draggedTile);
  
  // Check if dragged horizontally past other children
  for (let i = 0; i < children.length; i++) {
    if (i === draggedIndex) continue;
    
    const otherChild = children[i];
    const draggedX = draggedTile.left;
    const otherX = otherChild.left;
    
    // If dragged past another child horizontally
    if ((draggedIndex < i && draggedX > otherX) || (draggedIndex > i && draggedX < otherX)) {
      // Reorder the array
      children.splice(draggedIndex, 1);
      const newIndex = draggedX < otherX ? i - (draggedIndex < i ? 1 : 0) : i + (draggedIndex > i ? 1 : 0);
      children.splice(newIndex, 0, draggedTile);
      break;
    }
  }
}

function finalizeChildReordering(draggedTile) {
  // Find if this tile is a child and re-layout all children
  for (const [id, children] of Object.entries(connections)) {
    if (children.includes(draggedTile)) {
      const parentTile = canvas.getObjects().find(obj => obj.customId === id);
      if (parentTile) {
        layoutChildren(parentTile);
        moveChildrenWithParent(parentTile);
        updateConnections();
      }
      break;
    }
  }
}

function updateConnections() {
  // Remove all existing lines
  const lines = canvas.getObjects('line');
  lines.forEach(line => canvas.remove(line));

  // Redraw all connections
  Object.entries(connections).forEach(([parentId, children]) => {
    const parent = canvas.getObjects().find(obj => obj.customId === parentId);
    if (!parent) return;

    const parentCenter = parent.getCenterPoint();

    children.forEach(child => {
      const childCenter = child.getCenterPoint();
      const line = new fabric.Line(
        [parentCenter.x, parentCenter.y, childCenter.x, childCenter.y],
        {
          stroke: '#000',
          strokeWidth: 4,
          selectable: false,
          evented: true,
          customType: 'connection-line'
        }
      );

      // Add click handler to remove connections
      line.on('mousedown', () => {
        removeConnection(parent, child, line);
      });

      canvas.add(line);
      canvas.sendToBack(line);
    });
  });
}

function removeConnection(parent, child, line) {
  canvas.remove(line);
  const parentId = parent.customId;
  if (connections[parentId]) {
    connections[parentId] = connections[parentId].filter(c => c !== child);
    if (connections[parentId].length === 0) {
      delete connections[parentId];
    } else {
      layoutChildren(parent);
      updateConnections();
    }
  }
}

// Remove the old event listeners and add drag-and-drop functionality
document.addEventListener('DOMContentLoaded', () => {
  const paletteTiles = document.querySelectorAll('.palette-tile');
  const canvasWrapper = document.getElementById('canvas-wrapper');
  
  paletteTiles.forEach(tile => {
    tile.addEventListener('mousedown', (e) => {
      e.preventDefault();
      startDrag(tile, e);
    });
  });
  
  function startDrag(sourceTile, startEvent) {
    const type = sourceTile.dataset.type;
    const value = sourceTile.dataset.value;
    
    // Create a visual clone for dragging
    const dragClone = sourceTile.cloneNode(true);
    dragClone.style.position = 'fixed';
    dragClone.style.pointerEvents = 'none';
    dragClone.style.zIndex = '10000';
    dragClone.style.transform = 'scale(1.2)';
    dragClone.style.opacity = '0.8';
    document.body.appendChild(dragClone);
    
    // Position the clone at the mouse
    function updateClonePosition(e) {
      dragClone.style.left = (e.clientX - 40) + 'px';
      dragClone.style.top = (e.clientY - 17) + 'px';
    }
    
    updateClonePosition(startEvent);
    
    function onMouseMove(e) {
      updateClonePosition(e);
    }
    
    function onMouseUp(e) {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      
      // Check if dropped on canvas
      const canvasRect = canvasWrapper.getBoundingClientRect();
      if (e.clientX >= canvasRect.left && e.clientX <= canvasRect.right &&
          e.clientY >= canvasRect.top && e.clientY <= canvasRect.bottom) {
        
        // Calculate position relative to canvas
        const canvasX = e.clientX - canvasRect.left;
        const canvasY = e.clientY - canvasRect.top;
        
        // Create the appropriate tile
        if (type === 'word') {
          const color = posColors[value] || '#E0E0E0';
          const newTile = createTile('word', color, true, value);
          newTile.set({ left: canvasX - 60, top: canvasY - 30 });
        } else if (type === 'phrase') {
          const color = structureColors[value] || structureColors.phrase;
          const newTile = createTile(value, color);
          newTile.set({ left: canvasX - 60, top: canvasY - 25 });
        } else if (type === 'clause') {
          const newTile = createTile(value, structureColors.clause);
          newTile.set({ left: canvasX - 60, top: canvasY - 25 });
        }
        
        canvas.requestRenderAll();
      }
      
      // Remove the clone
      document.body.removeChild(dragClone);
    }
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }
});
const canvas = new fabric.Canvas('diagram-canvas');
let idCounter = 0;
const connections = {};
let selectedTile = null;

// Set up zoom functionality
canvas.on('mouse:wheel', function(opt) {
  var delta = opt.e.deltaY;
  var zoom = canvas.getZoom();
  zoom *= 0.999 ** delta;
  
  // Limit zoom range
  if (zoom > 20) zoom = 20;
  if (zoom < 0.01) zoom = 0.01;
  
  // Zoom towards mouse cursor
  canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
  
  opt.e.preventDefault();
  opt.e.stopPropagation();
});

// Handle mouse down events
canvas.on('mouse:down', function(opt) {
  var evt = opt.e;
  
  // Check for Ctrl+click on editable tiles first
  if ((evt.ctrlKey || evt.metaKey) && opt.target && opt.target.isEditable) {
    console.log('Canvas detected Ctrl+click on editable tile');
    // Prevent any other mouse events
    evt.preventDefault();
    evt.stopPropagation();
    // Edit the tile
    editTile(opt.target);
    return;
  }
  
  if (!opt.target) {
    // Clear selection if clicking empty space
    if (selectedTile) {
      setTileSelected(selectedTile, false);
      selectedTile = null;
    }
    
    // Enable panning
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
});

canvas.on('mouse:up', function(opt) {
  this.setViewportTransform(this.viewportTransform);
  this.isDragging = false;
  this.selection = true;
});

// Color mapping for different parts of speech (matching the HTML sidebar)
const posColors = {
  noun: '#E74C3C',        // Red (matches HTML)
  verb: '#27AE60',        // Green (matches HTML)
  adjective: '#F1C40F',   // Yellow (matches HTML)
  adverb: '#3498DB',      // Blue (matches HTML)
  preposition: '#95A5A6', // Gray (matches HTML)
  conjunction: '#34495E', // Dark gray (matches HTML)
  pronoun: '#E67E22',     // Orange (matches HTML)
  interjection: '#E91E63', // Pink (matches HTML)
  relativizer: '#9B59B6', // Purple (matches HTML)
  complementizer: '#2C3E50', // Dark blue (matches HTML)
  determiner: '#F39C12',  // Orange (matches HTML)
  modal: '#8E44AD',       // Purple (matches HTML)
  auxiliary: '#16A085'    // Teal (matches HTML)
};

function createTile(text, color, editable = false) {
  const rect = new fabric.Rect({
    width: 120,
    height: 40,
    fill: color,
    rx: 10,
    ry: 10,
    stroke: '#333',
    strokeWidth: 2,
    originX: 'center',
    originY: 'center'
  });

  // For editable tiles, show hint text initially
  const displayText = editable && text === 'type here' ? 'ctrl + click to type' : text;
  
  const label = new fabric.Text(displayText, {
    fontSize: editable && text === 'type here' ? 10 : 14,
    fill: '#000',
    textAlign: 'center',
    originX: 'center',
    originY: 'center',
    fontFamily: 'Arial, sans-serif',
    textBaseline: 'middle'
  });

  const group = new fabric.Group([rect, label], {
    left: 100 + idCounter * 10,
    top: 50 + idCounter * 10,
    hasControls: false,
    lockScalingX: true,
    lockScalingY: true
  });

  group.customId = `tile-${idCounter++}`;
  group.isEditable = editable;
  
  // Add all necessary event handlers
  setupTileEvents(group);

  canvas.add(group);
  return group;
}

function setupTileEvents(tile) {
  let lastPosition = { x: 0, y: 0 };
  
  // Handle movement
  tile.on('moving', () => {
    const currentPos = { x: tile.left, y: tile.top };
    const deltaX = currentPos.x - lastPosition.x;
    const deltaY = currentPos.y - lastPosition.y;
    
    moveSubtree(tile, deltaX, deltaY);
    lastPosition = currentPos;
    maintainHierarchy(tile);
    updateConnections();
  });
  
  // Handle mouse down - just track position
  tile.on('mousedown', (e) => {
    lastPosition = { x: tile.left, y: tile.top };
    e.e.stopPropagation();
  });

  // Handle double-clicks ONLY for selection and connection
  tile.on('mousedblclick', (e) => {
    e.e.stopPropagation();
    // NEVER open edit dialog on double-click
    handleTileDoubleClick(tile);
  });
}

function handleTileDoubleClick(tile) {
  console.log('Double click detected - handling selection/connection only');
  
  if (!selectedTile) {
    // First double-click: select the tile
    selectedTile = tile;
    setTileSelected(tile, true);
  } else if (selectedTile === tile) {
    // Double-clicking the same tile: deselect it
    setTileSelected(tile, false);
    selectedTile = null;
  } else {
    // Second double-click on different tile: connect them
    const tile1Y = selectedTile.top;
    const tile2Y = tile.top;
    
    let parent, child;
    if (tile1Y < tile2Y) {
      parent = selectedTile;
      child = tile;
    } else {
      parent = tile;
      child = selectedTile;
    }
    
    connectTiles(parent, child);
    setTileSelected(selectedTile, false);
    selectedTile = null;
  }
}

function setTileSelected(tile, isSelected) {
  const rect = tile.item(0);
  if (isSelected) {
    rect.set({ 
      stroke: '#0066ff', 
      strokeWidth: 5,
      shadow: new fabric.Shadow({
        color: '#0066ff',
        blur: 10,
        offsetX: 0,
        offsetY: 0
      })
    });
  } else {
    rect.set({ 
      stroke: '#333', 
      strokeWidth: 2,
      shadow: null
    });
  }
  canvas.requestRenderAll();
}

function editTile(tile) {
  console.log('Opening edit dialog for tile');
  const textObj = tile.item(1);
  const currentText = textObj.text;
  
  // Clear hint text for the input
  const inputText = (currentText === 'ctrl + click to type' || currentText === 'type here') ? '' : currentText;
  
  // Create a custom input overlay instead of using prompt()
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;
  
  const inputContainer = document.createElement('div');
  inputContainer.style.cssText = `
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  
  const label = document.createElement('div');
  label.textContent = 'Edit text:';
  label.style.marginBottom = '10px';
  
  const input = document.createElement('input');
  input.type = 'text';
  input.value = inputText;
  input.style.cssText = `
    width: 200px;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 14px;
  `;
  
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `
    margin-top: 10px;
    text-align: right;
  `;
  
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.cssText = `
    margin-right: 10px;
    padding: 6px 12px;
    border: 1px solid #ccc;
    background: white;
    border-radius: 4px;
    cursor: pointer;
  `;
  
  const okBtn = document.createElement('button');
  okBtn.textContent = 'OK';
  okBtn.style.cssText = `
    padding: 6px 12px;
    border: 1px solid #007bff;
    background: #007bff;
    color: white;
    border-radius: 4px;
    cursor: pointer;
  `;
  
  // Assemble the dialog
  buttonContainer.appendChild(cancelBtn);
  buttonContainer.appendChild(okBtn);
  inputContainer.appendChild(label);
  inputContainer.appendChild(input);
  inputContainer.appendChild(buttonContainer);
  overlay.appendChild(inputContainer);
  document.body.appendChild(overlay);
  
  // Focus and select the input
  input.focus();
  input.select();
  
  // Handle completion
  function closeDialog(save) {
    document.body.removeChild(overlay);
    
    if (save) {
      const finalText = input.value || 'ctrl + click to type';
      textObj.set({
        text: finalText,
        fontSize: (finalText === 'ctrl + click to type') ? 10 : 14
      });
      
      // Clear selection after editing
      if (selectedTile === tile) {
        console.log('Clearing selection after edit');
        setTileSelected(tile, false);
        selectedTile = null;
      }
      
      canvas.requestRenderAll();
    }
  }
  
  // Event handlers
  okBtn.addEventListener('click', () => closeDialog(true));
  cancelBtn.addEventListener('click', () => closeDialog(false));
  
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      closeDialog(true);
    } else if (e.key === 'Escape') {
      closeDialog(false);
    }
  });
  
  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeDialog(false);
    }
  });
}

function connectTiles(parentTile, childTile) {
  const parentId = parentTile.customId;
  
  // Check if child is already connected to another parent
  Object.entries(connections).forEach(([existingParentId, children]) => {
    if (children.includes(childTile)) {
      connections[existingParentId] = connections[existingParentId].filter(c => c !== childTile);
      if (connections[existingParentId].length === 0) {
        delete connections[existingParentId];
      }
    }
  });
  
  if (!connections[parentId]) {
    connections[parentId] = [];
  }
  
  if (!connections[parentId].includes(childTile) && connections[parentId].length < 6) {
    connections[parentId].push(childTile);
    
    if (parentTile.top >= childTile.top) {
      childTile.set({ top: parentTile.top + 50 }); // Reduced from 100 to 50
      childTile.setCoords();
    }
    
    layoutChildren(parentTile);
    updateConnections();
  }
}

function moveSubtree(parentTile, deltaX, deltaY) {
  const children = connections[parentTile.customId];
  if (!children || children.length === 0) return;
  
  children.forEach(child => {
    child.set({
      left: child.left + deltaX,
      top: child.top + deltaY
    });
    child.setCoords();
    moveSubtree(child, deltaX, deltaY);
  });
}

function maintainHierarchy(movedTile) {
  const children = connections[movedTile.customId];
  if (children && children.length > 0) {
    children.forEach(child => {
      if (child.top <= movedTile.top) {
        const deltaY = (movedTile.top + 50) - child.top; // Reduced from 100 to 50
        child.set({ top: movedTile.top + 50 }); // Reduced from 100 to 50
        child.setCoords();
        moveSubtree(child, 0, deltaY);
      }
    });
    layoutChildren(movedTile);
  }
  
  Object.entries(connections).forEach(([parentId, childrenArray]) => {
    if (childrenArray.includes(movedTile)) {
      const parent = canvas.getObjects().find(obj => obj.customId === parentId);
      if (parent && movedTile.top <= parent.top) {
        const deltaY = (parent.top + 50) - movedTile.top; // Reduced from 100 to 50
        movedTile.set({ top: parent.top + 50 }); // Reduced from 100 to 50
        movedTile.setCoords();
        moveSubtree(movedTile, 0, deltaY);
      }
    }
  });
}

function layoutChildren(parent) {
  const children = connections[parent.customId];
  if (!children || children.length === 0) return;

  const spacing = 140;
  const count = children.length;
  const totalWidth = spacing * (count - 1);
  const startX = parent.left - totalWidth / 2;
  const y = parent.top + 50; // Reduced from 100 to 50

  children.forEach((child, i) => {
    child.set({
      left: startX + i * spacing,
      top: y
    });
    child.setCoords();
  });
}

function updateConnections() {
  const lines = canvas.getObjects('line');
  lines.forEach(line => canvas.remove(line));

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
          strokeWidth: 2,
          selectable: false,
          evented: true,
          customType: 'connection-line'
        }
      );

      line.on('mousedown', (e) => {
        e.e.stopPropagation();
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

// Set up keyboard shortcuts
document.addEventListener('keydown', function(e) {
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (selectedTile) {
      deleteTile(selectedTile);
    }
  }
  if (e.key === 'Escape') {
    if (selectedTile) {
      setTileSelected(selectedTile, false);
      selectedTile = null;
    }
  }
});

function deleteTile(tile) {
  const tileId = tile.customId;
  
  if (connections[tileId]) {
    delete connections[tileId];
  }
  
  Object.entries(connections).forEach(([parentId, children]) => {
    const index = children.indexOf(tile);
    if (index > -1) {
      children.splice(index, 1);
      if (children.length === 0) {
        delete connections[parentId];
      } else {
        const parent = canvas.getObjects().find(obj => obj.customId === parentId);
        if (parent) {
          layoutChildren(parent);
        }
      }
    }
  });
  
  canvas.remove(tile);
  
  if (selectedTile === tile) {
    selectedTile = null;
  }
  
  updateConnections();
  console.log('Deleted tile:', tileId);
}

// Set up drag and drop
document.addEventListener('DOMContentLoaded', function() {
  console.log('Setting up drag and drop...');
  
  const tiles = document.querySelectorAll('.palette-tile');
  console.log('Found', tiles.length, 'palette tiles');
  
  tiles.forEach(tile => {
    tile.addEventListener('dragstart', function(e) {
      console.log('Drag started for:', this.getAttribute('data-value'));
      const data = {
        type: this.getAttribute('data-type'),
        value: this.getAttribute('data-value')
      };
      e.dataTransfer.setData('text/plain', JSON.stringify(data));
      e.dataTransfer.effectAllowed = 'copy';
    });
  });
  
  const canvasElement = canvas.upperCanvasEl;
  console.log('Canvas element found:', !!canvasElement);
  
  if (canvasElement) {
    canvasElement.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });
    
    canvasElement.addEventListener('drop', function(e) {
      console.log('Drop event triggered');
      e.preventDefault();
      
      const data = e.dataTransfer.getData('text/plain');
      if (!data) return;
      
      try {
        const dropData = JSON.parse(data);
        const canvasRect = canvasElement.getBoundingClientRect();
        const x = e.clientX - canvasRect.left;
        const y = e.clientY - canvasRect.top;
        
        let tile;
        
        if (dropData.type === 'word') {
          const color = posColors[dropData.value] || '#ccc';
          console.log('Creating word tile with color:', color, 'for value:', dropData.value);
          tile = createTile('type here', color, true);
        } else if (dropData.type === 'phrase') {
          const phraseColors = {
            'NP': '#F1948A',
            'VP': '#58D68D', 
            'PP': '#BDC3C7',
            'ADJP': '#F7DC6F',
            'ADVP': '#85C1E9'
          };
          const color = phraseColors[dropData.value] || '#ccc';
          tile = createTile(dropData.value, color);
        } else if (dropData.type === 'clause') {
          tile = createTile(dropData.value, '#ffffff');
        }
        
        if (tile) {
          tile.set({
            left: x - 60,
            top: y - 20
          });
          tile.setCoords();
          canvas.requestRenderAll();
        }
      } catch (error) {
        console.error('Error parsing drop data:', error);
      }
    });
  }
  
  // Set up zoom control buttons
  document.getElementById('zoom-in').addEventListener('click', () => {
    const zoom = canvas.getZoom();
    canvas.setZoom(Math.min(zoom * 1.2, 20));
  });
  
  document.getElementById('zoom-out').addEventListener('click', () => {
    const zoom = canvas.getZoom();
    canvas.setZoom(Math.max(zoom * 0.8, 0.01));
  });
  
  document.getElementById('zoom-reset').addEventListener('click', () => {
    canvas.setZoom(1);
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  });
});
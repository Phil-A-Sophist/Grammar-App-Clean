const canvasArea = document.getElementById('canvas-area');
const connectionLayer = document.getElementById('connection-layer');
const stagingArea = document.getElementById('staging-area');
let zIndexCounter = 1;
const connections = [];
let selectedTile = null;

function createSVGLine(x1, y1, x2, y2) {
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", x1);
  line.setAttribute("y1", y1);
  line.setAttribute("x2", x2);
  line.setAttribute("y2", y2);
  line.setAttribute("stroke", "black");
  line.setAttribute("stroke-width", "2");
  line.setAttribute("class", "connector-line");

  // Allow click-to-delete
  line.addEventListener("click", () => {
    line.remove();
    const index = connections.findIndex(c => c.line === line);
    if (index !== -1) connections.splice(index, 1);
  });

  return line;
}

function getTileCenter(tile) {
  const box = tile.getBoundingClientRect();
  const canvasBox = canvasArea.getBoundingClientRect();
  return {
    x: box.left + box.width / 2 - canvasBox.left,
    y: box.top + box.height / 2 - canvasBox.top
  };
}

function updateConnections(tile) {
  const canvasBox = canvasArea.getBoundingClientRect();
  connections.forEach(c => {
    if (c.from === tile || c.to === tile) {
      const from = getTileCenter(c.from);
      const to = getTileCenter(c.to);
      c.line.setAttribute("x1", from.x);
      c.line.setAttribute("y1", from.y);
      c.line.setAttribute("x2", to.x);
      c.line.setAttribute("y2", to.y);
    }
  });
}

function connectTiles(fromTile, toTile) {
  const from = getTileCenter(fromTile);
  const to = getTileCenter(toTile);
  const line = createSVGLine(from.x, from.y, to.x, to.y);
  connectionLayer.appendChild(line);
  connections.push({ from: fromTile, to: toTile, line });
}

function makeDraggable(tile) {
  tile.addEventListener('mousedown', function (e) {
    const offsetX = e.clientX - tile.offsetLeft;
    const offsetY = e.clientY - tile.offsetTop;
    tile.style.zIndex = zIndexCounter++;

    function moveAt(mouseX, mouseY) {
      tile.style.left = (mouseX - offsetX) + 'px';
      tile.style.top = (mouseY - offsetY) + 'px';
      updateConnections(tile);
    }

    function onMouseMove(e) {
      moveAt(e.clientX, e.clientY);
    }

    document.addEventListener('mousemove', onMouseMove);
    tile.onmouseup = () => {
      document.removeEventListener('mousemove', onMouseMove);
      tile.onmouseup = null;
    };
  });

  tile.addEventListener('dblclick', () => {
    if (!selectedTile) {
      selectedTile = tile;
      tile.classList.add('selected');
    } else if (selectedTile === tile) {
      selectedTile.classList.remove('selected');
      selectedTile = null;
    } else {
      connectTiles(selectedTile, tile);
      selectedTile.classList.remove('selected');
      selectedTile = null;
    }
  });

  tile.ondragstart = () => false;
}

function createTile(className, text, editable = false) {
  const tile = document.createElement('div');
  tile.className = className;

  if (editable) {
    tile.contentEditable = true;
    tile.innerText = 'type here';
    tile.classList.add('placeholder');

    tile.addEventListener('focus', () => {
      if (tile.innerText === 'type here') {
        tile.innerText = '';
        tile.classList.remove('placeholder');
      }
    });

    tile.addEventListener('blur', () => {
      if (tile.innerText.trim() === '') {
        tile.innerText = 'type here';
        tile.classList.add('placeholder');
      }
    });
  } else {
    tile.innerText = text;
  }

  makeDraggable(tile);
  return tile;
}

function moveToCanvas(tile) {
  canvasArea.appendChild(tile);
  tile.style.left = '20px';
  tile.style.top = '20px';
}

document.getElementById('add-word-btn').addEventListener('click', () => {
  const part = document.getElementById('part-of-speech').value;
  const tile = createTile(`word-tile ${part}`, 'type here', true);
  tile.addEventListener('dblclick', () => moveToCanvas(tile));
  stagingArea.appendChild(tile);
});

document.getElementById('add-phrase-btn').addEventListener('click', () => {
  const phrase = document.getElementById('phrase-type').value;
  const tile = createTile('structure-node', phrase);
  tile.addEventListener('dblclick', () => moveToCanvas(tile));
  stagingArea.appendChild(tile);
});

document.getElementById('add-clause-btn').addEventListener('click', () => {
  const clause = document.getElementById('clause-type').value;
  const tile = createTile('structure-node', clause);
  tile.addEventListener('dblclick', () => moveToCanvas(tile));
  stagingArea.appendChild(tile);
});

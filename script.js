const canvas = document.getElementById("canvas");
const addButton = document.getElementById("addTile");

addButton.addEventListener("click", () => {
  const tile = document.createElement("div");
  tile.className = "tile";
  tile.contentEditable = true; // student can type in it
  tile.innerText = "Word";

  // Give it a starting position
  tile.style.top = Math.random() * 300 + "px";
  tile.style.left = Math.random() * 300 + "px";

  // Make it draggable
  makeDraggable(tile);

  canvas.appendChild(tile);
});

function makeDraggable(el) {
  let offsetX, offsetY;

  el.addEventListener("mousedown", (e) => {
    offsetX = e.clientX - el.offsetLeft;
    offsetY = e.clientY - el.offsetTop;

    function move(e) {
      el.style.left = e.clientX - offsetX + "px";
      el.style.top = e.clientY - offsetY + "px";
    }

    function stop() {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stop);
    }

    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", stop);
  });
}

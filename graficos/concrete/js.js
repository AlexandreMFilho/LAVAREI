// concrete.js downloads and documentation can be found at http://www.concretejs.com

var viewport = new Concrete.Viewport({
  container: document.getElementById('concreteContainer'),
  width: 500,
  height: 500
});

var mainLayer = new Concrete.Layer();
var hoveredLayer = new Concrete.Layer();
hoveredLayer.visible = false;

viewport.add(hoveredLayer).add(mainLayer);

var mainSceneContext = mainLayer.scene.context;
var mainHitContext = mainLayer.hit.context;
var hoveredSceneContext = hoveredLayer.scene.context;

function drawBranch(x0, y0, width, level) {
  var x1 = ((Math.random()-0.5) * 30) + x0,
      y1 = y0 - (Math.random() * y0 * 0.1);
  
  mainSceneContext.beginPath();
  mainSceneContext.moveTo(x0, y0);
  mainSceneContext.lineTo(x1, y1);
  mainSceneContext.lineWidth = width;
  mainSceneContext.stroke();
  
  mainHitContext.beginPath();
  mainHitContext.moveTo(x0, y0);
  mainHitContext.lineTo(x1, y1);
  mainHitContext.lineWidth = width + 5;
  mainHitContext.stroke();
  
  hoveredSceneContext.beginPath();
  hoveredSceneContext.moveTo(x0, y0);
  hoveredSceneContext.lineTo(x1, y1);
  hoveredSceneContext.lineWidth = width + 5;
  hoveredSceneContext.stroke();
  
  if (y1 > 30 && level < 40) {
    drawBranch(x1, y1, width*0.9, level+1);
    
    // randomly branch
    if (Math.random() < 0.1) {
      drawBranch(x1, y1, width*0.9, level+1);
    }
  }
}

mainSceneContext.strokeStyle = 'red';
mainSceneContext.lineCap = 'round';

mainHitContext.strokeStyle = mainLayer.hit.getColorFromIndex(0);;
mainHitContext.lineCap = 'round';

hoveredSceneContext.strokeStyle = 'black';
hoveredSceneContext.lineCap = 'round';

// start drawing
drawBranch(250, 500, 30, 0);
viewport.render();

// listen for mousemove events
concreteContainer.addEventListener('mousemove', _.throttle(function(evt) {
  var boundingRect = concreteContainer.getBoundingClientRect(),
      x = evt.clientX - boundingRect.left,
      y = evt.clientY - boundingRect.top,
      key = viewport.getIntersection(x, y);
  
  if (key >= 0) {
    hoveredLayer.visible = true; 
    viewport.render();
  }
  else {
    hoveredLayer.visible = false;
    viewport.render();
  }
}));
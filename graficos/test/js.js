var canvas=document.getElementById("canvas");
var ctx=canvas.getContext("2d");
var cw=canvas.width;
var ch=canvas.height;
function reOffset(){
  var BB=canvas.getBoundingClientRect();
  offsetX=BB.left;
  offsetY=BB.top;        
}
var offsetX,offsetY;
reOffset();
window.onscroll=function(e){ reOffset(); }
window.onresize=function(e){ reOffset(); }

ctx.font='14px verdana';

var shapes=[];

var triangle1={
  name:'triangle1',
  color:'skyblue',
  drawcolor:'skyblue',
  points:[{x:100,y:100},{x:150,y:150},{x:50,y:150}]
};

var triangle2={
  name:'triangle2',
  color:'palegreen',
  drawcolor:'palegreen',
  points:[{x:220,y:100},{x:270,y:150},{x:170,y:150}]
};

shapes.push(triangle1,triangle2);

$("#canvas").mousemove(function(e){handleMouseMove(e);});

drawAll();

function drawAll(){
  for(var i=0;i<shapes.length;i++){
    var s=shapes[i];
    defineShape(s.points);
    ctx.fillStyle=s.drawcolor;
    ctx.fill();
    ctx.stroke();
    if(s.color!==s.drawcolor){
      ctx.fillStyle='black';
      ctx.fillText(s.name,s.points[0].x,s.points[0].y);
    }
  }
}


function defineShape(s){
  ctx.beginPath();
  ctx.moveTo(s[0].x,s[0].y);
  for(var i=1;i<s.length;i++){
    ctx.lineTo(s[i].x,s[i].y);
  }
  ctx.closePath();
}

function handleMouseMove(e){
  // tell the browser we're handling this event
  e.preventDefault();
  e.stopPropagation();

  mouseX=parseInt(e.clientX-offsetX);
  mouseY=parseInt(e.clientY-offsetY);

  // clear the canvas
  ctx.clearRect(0,0,cw,ch);

  for(var i=0;i<shapes.length;i++){
    var s=shapes[i];

    // define the shape path we want to test against the mouse position
    defineShape(s.points);
    // is the mouse insied the defined shape?
    if(ctx.isPointInPath(mouseX,mouseY)){
      // if yes, fill the shape in red
      s.drawcolor='red';
    }else{
      // if no, fill the shape with blue
      s.drawcolor=s.color;
    }

  }
  
  drawAll();
}
var pizza = [];
var cx = 100, cy = 75, r = 50;

var view = new Concrete.Viewport({
  container: document.getElementById("concreteContainer"),
  width: 400,
  height: 200,
});

class Fatia{
  constructor(val,cor,rotulo,offset,indice){
    this.valor = Number(val);
    this.cor = cor;
    this.rotulo = rotulo;
    this.offset = Number(offset);
    this.key = indice;
  };  
};

function pedido(fat){
  var offset = 0;
  for(var i = 0; i < fat.length; i++){
    pizza.push(new Fatia(fat[i].valor,fat[i].cor,fat[i].rotulo,offset,i));
    offset = Number(offset+fat[i].valor);
    desenha(pizza);
  }
}

function desenha(pizza){
  var layer = new Concrete.Layer();
  var hover = new Concrete.Layer(); 
  
  layer.visible = true;
  hover.visible = false;
  
  view.add(layer);
  view.add(hover);
  
  ctx = layer.scene.context;
  hv = hover.scene.context;
  hit = layer.hit.context;
  
  for(var i = 0; i < pizza.length; i++){
    var x = pizza[i].offset;                                        
    var y = pizza[i].offset + pizza[i].valor;                        
    
    ctx.fillStyle = pizza[i].cor; //seta a cor da fatia
    hv.fillStyle = 'green'; //seta a cor da fatia
    
    //Desenha a fatia
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx,cy,r,degtorad(x)*3.6,degtorad(y)*3.6,false);
    ctx.lineTo(cx, cy);
    ctx.fill();

    hit.beginPath();
    hit.moveTo(cx, cy);
    hit.arc(cx,cy,r,degtorad(x)*3.6,degtorad(y)*3.6,false);
    hit.lineTo(cx, cy);
    hit.fill();
    
    hv.beginPath();
    hv.moveTo(cx, cy);
    hv.arc(cx,cy,r+1,degtorad(x)*3.6,degtorad(y)*3.6,false);
    hv.lineTo(cx, cy);
    hv.stroke();
    hv.strokeStyle = 'green';
    hv.lineWidth = 3;    
    
    //Desenha o bloco da legenda
    ctx.rect(200, 20*(i), 10, 10);
    ctx.fill();
    
    hv.rect(200, 20*(i), 10+2, 10+2);
    hv.stroke();
    
    //Desenha a legenda
    ctx.fillText(`${pizza[i].rotulo}: ${pizza[i].valor}%` , 220,10+(20*(i)));
    hv.fillText(`${pizza[i].rotulo}: ${pizza[i].valor}%` , 220,10+(20*(i)));
    
    
    ctx.closePath();
    // pizza[i].desenho = imagem;
    view.render();
  }
}

function degtorad(degrees)
{
  var pi = Math.PI;
  return degrees * (pi/180);
}

concreteContainer.addEventListener('mousemove', function(evt) {
  var boundingRect = concreteContainer.getBoundingClientRect(),
  x = evt.clientX - boundingRect.left,
  y = evt.clientY - boundingRect.top,
  key = view.getIntersection(x, y),
  hovers;
  
  console.log(key);
  // unhover all circles
  view.Layers.forEach(function(hovers){
    hovers.visible = false;
  })

  if(key >= 0){
    var slice = getslice(key),
    index = slice[key];
    hovers[index+1].visible = true;
  }
  view.render();
});

function getslice(key){
var len = view.Layers.length,
    n, slice;
for(n=0; n<len; n+=2) {
  slice = view.Layers[n]
  if (slice.key === key) {
    return slice;
  }
}
return null;
}
    
function cansado(){
      var a = [ {valor:10,cor:"#fcba03",rotulo:"a"},
                {valor:10,cor:"#03fc3d",rotulo:"b"},
                {valor:20,cor:"#0377fc",rotulo:"c"},
                {valor:20,cor:"#d703fc",rotulo:"d"},
                {valor:20,cor:"#411d47",rotulo:"e"},
                {valor:20,cor:"#656d73",rotulo:"f"}];
      pedido(a);
}

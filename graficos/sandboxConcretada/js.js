var pizza = [];
var cx = 100, cy = 75, r = 50;

var view = new Concrete.Viewport({
  width: 800,
  height: 200,
  container: document.getElementById("concreteContainer"),
});


class Fatia{
  constructor(val,cor,rotulo,offset,indice){
    this.valor = val;
    this.cor = cor;
    this.rotulo = rotulo;
    this.offset = offset;
    this.key = indice;
    this.hovered = false;
  }
};


function pedido(){
  var a = [ {valor:10,cor:"#fcba03",rotulo:"a"},
            {valor:10,cor:"#03fc3d",rotulo:"b"},
            {valor:20,cor:"#0377fc",rotulo:"c"},
            {valor:20,cor:"#d703fc",rotulo:"d"},
            {valor:20,cor:"#411d47",rotulo:"e"},
            {valor:20,cor:"#656d73",rotulo:"f"}];
  var offset = 0;
  for(var i = 0; i < a.length; i++){
    pizza.push(new Fatia(a[i].valor,a[i].cor,a[i].rotulo,offset,i));
    offset = Number(offset+a[i].valor);
    inicializa(i);
    desenha(pizza[i],view.layers[i]);
  }
  criaHover();
}


function criaHover(){
  var hover = new Concrete.Layer();
  hover.id = view.layers.length-1;
  hover.visible = true;
  view.add(hover);
}


function inicializa(key){
  var layer = new Concrete.Layer();
  layer.id = key;
  layer.visible = true;
  view.add(layer);
}


function desenha(pizza,layer){
  
  ctx = layer.scene.context;
  hit = layer.hit.context;
  key = layer.id;
  var x = pizza.offset;              
  var y = pizza.offset + pizza.valor;

  ctx.fillStyle = pizza.cor; //seta a cor da fatia
  
  //Desenha a fatia
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx,cy,r,degtorad(x)*3.6,degtorad(y)*3.6,false);
  ctx.lineTo(cx, cy);
  ctx.fill();

  //Desenha o bloco da legenda
  ctx.rect(200, 20+(20*(key)), 10, 10);
  ctx.fill();
  
  //Desenha a legenda
  ctx.fillText(`${pizza.rotulo}: ${pizza.valor}%` , 220,30+(20*(key)));
  ctx.closePath();
  
  hit.beginPath();
  hit.moveTo(cx, cy);
  hit.arc(cx,cy,r,degtorad(x)*3.6,degtorad(y)*3.6,false);
  hit.lineTo(cx, cy);
  hit.fill();
  hit.closePath();

  view.render();
}


function degtorad(degrees)
{
  var pi = Math.PI;
  return degrees * (pi/180);
}


function mostraHover(pizza,layer,hv){
  hv.scene.clear();
  hv.visible = true;
  ctx = hv.scene.context;
  ctx.fillStyle = pizza.cor;

  var x = pizza.offset,           
      y = pizza.offset + pizza.valor,
      key = pizza.key;
             
  //Isso pode vir a ser uma nova layer de fundo:
  //Bloco lateral
  ctx.beginPath();
  ctx.fillRect(300, 5, 400, 200);
  ctx.closePath();
  
  //Desenha a fatia
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx,cy,r+1,degtorad(x)*3.6,degtorad(y)*3.6,false);
  ctx.lineWidth = 3;
  ctx.lineTo(cx, cy);
  ctx.strokeStyle = 'red';
  ctx.stroke();
  ctx.closePath();

  //Desenha o bloco da legenda
  ctx.rect(200, 20+(20*(key)), 10, 10);
  ctx.stroke();
  ctx.closePath();

  //Realça a legenda
  ctx.beginPath();
  ctx.rect(220, 20+(20*(key)), 50, 10);
  ctx.fillStyle = "rgb(105 105 105 / 50%)";
  ctx.fill();
  ctx.closePath();
}


// add concrete container handlers
concreteContainer.addEventListener('mousemove', function(evt) {
  var boundingRect = concreteContainer.getBoundingClientRect(),
      x = evt.clientX - boundingRect.left,
      y = evt.clientY - boundingRect.top,
      key,
      aux;
  // unhover all circles
  pizza.forEach(function(aux) {
    aux.hovered = false;
  });
  

  view.layers.forEach(function(layer) {
    console.log(key)

    if(layer.hit.getIntersection(x, y)!=-1){
      key = layer.id;
      console.log(key)
      pizza[key].hovered = true;
      mostraHover(pizza[key],view.layers[key],view.layers[view.layers.length-1]);
    }
    if(key == undefined)view.layers[view.layers.length-1].visible = false;
  });

  view.render();
});


function getCircleFromKey(key) {
  var len = pizza.length,
  n, aux;
  
  for (n=0; n<len; n++) {
    aux = pizza[n];
    if (aux.key === key) {
      console.log(`fez${aux}`);
      return aux;
    }
  }
  return null;
}



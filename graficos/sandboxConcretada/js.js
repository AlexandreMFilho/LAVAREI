var pizza = [],

    cx = 300, cy = 300, r = 250,

    espacamento_bloco_y = 50, tamanho_bloco = 30,x_bloco = cx+r+50,//y_bloco = 20,

    x_legenda = x_bloco+50, y_legenda = 20,font_legenda = "20px Arial",
    centro_legenda = 40,largura_legenda = 350,

    x_info = x_bloco, y_info = cy+50, largura_info = 400, altura_info = 200,

    cor_realce = "rgb(255 0 0 / 50%)",
    rosquinha = true;

    
var view = new Concrete.Viewport({
  width: 1000,
  height: 600,
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
  var x = pizza.offset,              
      y = pizza.offset + pizza.valor;

  ctx.fillStyle = pizza.cor; //seta a cor da fatia

  //Desenha a fatia
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx,cy,r,degtorad(x)*3.6,degtorad(y)*3.6,false);
  ctx.lineTo(cx, cy);
  ctx.fill();

  //Desenha o bloco da legenda
  ctx.rect(x_bloco, 20+(espacamento_bloco_y*(key)), tamanho_bloco, tamanho_bloco);
  ctx.fill();
  
  //Desenha a legenda
  ctx.font = font_legenda;
  ctx.fillText(`${pizza.rotulo}: ${pizza.valor}%` , x_legenda,centro_legenda+(espacamento_bloco_y*(key)));
  ctx.closePath();
  
  //HIT
  hit.beginPath();      //HIT_fatia
  hit.moveTo(cx, cy);
  hit.arc(cx,cy,r,degtorad(x)*3.6,degtorad(y)*3.6,false);
  hit.lineTo(cx, cy);
  hit.fill();
                        //HIT_bloco
  hit.rect(x_bloco, 20+(espacamento_bloco_y*(key)), tamanho_bloco, tamanho_bloco);
  hit.fill();
                        //HIT_legenda
  hit.rect(x_legenda, 20+(espacamento_bloco_y*(key)), largura_legenda, tamanho_bloco);
  hit.fill();

  hit.closePath();

  if(rosquinha){
    //Desenha circulo central
    ctx.beginPath();
    ctx.arc(cx,cy,r/4,degtorad(0)*3.6,degtorad(100)*3.6,false);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.closePath();
  }

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
  ctx.fillRect(x_info, y_info, largura_info, altura_info);
  ctx.closePath();

  ctx.fillStyle = 'black';
  ctx.font = font_legenda;
  ctx.fillText(`Rótulo: ${pizza.rotulo}` , x_info+20,y_info+30);
  ctx.fillText(`Valor: ${pizza.valor}%` , x_info+20,y_info+60);
  ctx.closePath();
  
  //Desenha a fatia
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx,cy,r+1,degtorad(x)*3.6,degtorad(y)*3.6,false);
  ctx.lineWidth = 3;
  ctx.lineTo(cx, cy);
  ctx.fillStyle = cor_realce;
  ctx.fill();
  ctx.closePath();

  //Desenha o bloco da legenda
  ctx.rect(x_bloco, 20+(espacamento_bloco_y*(key)), tamanho_bloco, tamanho_bloco);
  ctx.stroke();
  ctx.strokeStyle = cor_realce;
  ctx.closePath();

  //Realça a legenda
  ctx.beginPath();
  ctx.rect(x_legenda, 20+(espacamento_bloco_y*(key)), largura_legenda, tamanho_bloco);
  ctx.fillStyle = cor_realce;
  ctx.fill();
  ctx.closePath();

  if(rosquinha){
    ctx.beginPath();
    ctx.arc(cx,cy,r/4,degtorad(0)*3.6,degtorad(100)*3.6,false);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.fillStyle = 'black';
    ctx.fillText(`${pizza.rotulo}: ${pizza.valor}%` , cx-30,cy+5);
    ctx.closePath();
  }
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



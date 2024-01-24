var total = 0;
var pizza = [];
var fatiasatual = 0;
              
var cx = 100, cy = 75, r = 50;

var view = new Concrete.Viewport({
  container: document.getElementById("concreteContainer"),
  width: 400,
  height: 200,
});

class Fatia{

  constructor(val,nome,indice){
    this.valor = Number(val);
    this.cor = nome == "base" ? "#000000" : "#"+((1<<24)*Math.random()|0).toString(16);
    this.rotulo = nome;
    this.offset = 0;
    this.key = indice;
  };

  criaoffset(pizza){
    this.offset= Number(pizza[fatiasatual-1].valor) + Number(pizza[fatiasatual-1].offset);
  };

  crialegend(pizza){
    this.legend = `${this.rotulo}: ${this.valor}%`;
  }

};

function pedido(fat){
  for(var i = 0; i < fat.length; i++){
    pizza.push(new Fatia(fat[i].valor,fat[i].rotulo,i));
    fatiasatual++;
    pizza[fatiasatual].criaoffset(pizza);
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

  for(var i = 1; i < pizza.length; i++){
    var x = pizza[i].offset;                                        
    var y = pizza[i].offset + pizza[i].valor;                        
    
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
    ctx.fillStyle = pizza[i].cor; //seta a cor da fatia
    ctx.fillText(`${pizza[i].rotulo}: ${pizza[i].valor}%` , 220,10+(20*(i)));

    hv.fillStyle = 'green'; //seta a cor da fatia
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

function cansado(){
  var a = [{valor:10,rotulo:"a"},{valor:10,rotulo:"b"},{valor:20,rotulo:"c"},{valor:20,rotulo:"d"},{valor:20,rotulo:"e"},{valor:20,rotulo:"f"}];
  pedido(a);
}

concreteContainer.addEventListener('mousemove', function(evt) {
  var boundingRect = concreteContainer.getBoundingClientRect(),
      x = evt.clientX - boundingRect.left,
      y = evt.clientY - boundingRect.top,
      key = view.getIntersection(x, y),
      hovers = view.Layers;
      console.log(key);
      
      // unhover all circles
  for(var i = 0; i < hovers.length; i+=2){
    hovers[i+1].visible = false;
  }
});

// console.log(`pizza:${pizza}`);
// console.log(`view:${view.layers}`);



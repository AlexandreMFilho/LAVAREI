var total = 0;
var pizza = [];
var fatiasatual = 0;
              
var cx = 100, cy = 75, r = 50;

var view = new Concrete.Viewport({
  width: 400,
  height: 200,
  container: document.getElementById("concreteContainer"),
});

class Fatia{

  constructor(val,nome,indice){
    this.valor = Number(val);
    this.cor = nome == "base" ? "#000000" : "#"+((1<<24)*Math.random()|0).toString(16);
    this.rotulo = nome;
    this.offset = 0;
    this.key = indice;
    this.hovered = false;
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
  
  layer.visible = true;
  
  view.add(layer);
  layer.scene.canvas.getContext('2d');
  layer.hit.canvas.getContext('2d');
  ctx = layer.scene.context;
  hit = layer.hit.context;
  var last = pizza.length-1;

  //for(var i = 1; i < pizza.length; i++){

    var x = pizza[last].offset;                                        
    var y = pizza[last].offset + pizza[last].valor;
    
    ctx.fillStyle = pizza[last].cor; //seta a cor da fatia
    
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

    
    //Desenha o bloco da legenda
    ctx.rect(200, 20*(last), 10, 10);
    ctx.fill();
    
    
    //Desenha a legenda
    ctx.fillText(`${pizza[last].rotulo}: ${pizza[last].valor}%` , 220,10+(20*(last)));
    
    
    if(pizza[last].hovered){
      ctx.strokeStyle = 'green';
      ctx.lineWidth = 3;
      ctx.moveTo(cx, cy);
      ctx.arc(cx,cy,r+1,degtorad(x)*3.6,degtorad(y)*3.6,false);
      ctx.lineTo(cx, cy);
      ctx.stroke();
    }
    
    ctx.closePath();
    view.render();
  //}
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

      // add concrete container handlers
      concreteContainer.addEventListener('mousemove', function(evt) {
        var boundingRect = concreteContainer.getBoundingClientRect(),
            x = evt.clientX - boundingRect.left,
            y = evt.clientY - boundingRect.top,
            key = view.getIntersection(x, y),
            aux;
        console.log(key);

        // unhover all circles
        pizza.forEach(function(aux) {
          aux.hovered = false;
        });
        
        if (key >= 0) {
          aux = getCircleFromKey(key);
          aux.hovered = true;
        }

        view.render();
      });
      
      function getCircleFromKey(key) {
        var len = pizza.length,
        n, aux;
        console.log(`fez${key}`);
        
        for (n=0; n<len; n++) {
          aux = pizza[n];
          if (aux.key === key) {
            return aux;
          }
        }

        return null;
      }

 /*
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
    index = slice.key;
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


// console.log(`pizza:${pizza}`);
// console.log(`view:${view.layers}`);


*/
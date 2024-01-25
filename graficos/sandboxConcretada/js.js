var pizza = [];
var cx = 100, cy = 75, r = 50;

var view = new Concrete.Viewport({
  width: 400,
  height: 200,
  container: document.getElementById("concreteContainer"),
});

class Fatia{
  constructor(val,cor,rotulo,offset,indice){
    this.valor = Number(val);
    this.cor = cor;
    this.rotulo = rotulo;
    this.offset = Number(offset);
    this.key = indice;
    this.hovered;
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

}

function degtorad(degrees)
{
  var pi = Math.PI;
  return degrees * (pi/180);
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



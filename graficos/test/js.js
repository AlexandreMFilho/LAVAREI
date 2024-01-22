
var total = 0;
var pizza = [];
var fatiasatual = 0;
              
var cx = 100, cy = 75, r = 50;


function context(){
  canvas = document.getElementById("myChart");
  if(!canvas.getContext){
    //alert("Seu navegador não suporta canvas");
  }else{
    //console.log("Suporte a canvas");
    ctx = canvas.getContext("2d");
    ctx.font = "18px serif";
  }
}


class fatia{

  constructor(val,nome){
    this.valor = Number(val);
    this.cor = nome == "base" ? "#000000" : "#"+((1<<24)*Math.random()|0).toString(16);
    this.rotulo = nome;
    this.offset = 0;
    this.desenho = "";
    this.layer = "";
    this.hovered = false;
    this.selected = false;
    this.cx = cx;
    this.cy = cy;
    this.r = r;
    this.x = 0;
    this.y = 0;
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
    pizza.push(new fatia(fat[i].valor,fat[i].rotulo));
    fatiasatual++;
    pizza[fatiasatual].criaoffset(pizza);
    desenha(pizza);
  }
}

function desenha(pizza){
  for(var i = 1; i < pizza.length; i++){
    pizza[i].x = pizza[i].offset;
    pizza[i].y = pizza[i].offset + pizza[i].valor;
    var x = pizza[i].offset;                                        
    var y = pizza[i].offset + pizza[i].valor;                        
    ctx.fillStyle = pizza[i].cor; //seta a cor da fatia
  
  //Desenha a fatia
  const imagem = new Path2D();
  ctx.beginPath();
  imagem.moveTo(cx, cy);
  imagem.arc(cx,cy,r,degtorad(x)*3.6,degtorad(y)*3.6,false);
  imagem.lineTo(cx, cy);
  ctx.fill(imagem);
  
  //Desenha o bloco da legenda
  imagem.rect(200, 20*(i), 10, 10);
  ctx.fill(imagem);
  
  //Desenha a o bloco da legenda
  ctx.fillText(`${pizza[i].rotulo}: ${pizza[i].valor}%` , 220,10+(20*(i)));

  pizza[i].desenho = imagem;
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


// cxs = document.getElementById("canvas");
// cxs.mousemove(function(e){handleMouseMove(e);});


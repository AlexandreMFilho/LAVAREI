var fatiasatual =0, total = 0;
var fatia = [{"valor":0,"offset":0,"cor":"#000000","rotulo":"","pizza":""}];
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

function novafatia(){
  //Aquisição de dados (valor e label)
  var x = document.getElementsByClassName("item")[0].value;
  var nome = document.getElementsByClassName("nome")[0].value;
  
  //Verificação de valor negativo
  //Caso seja negativo, o valor é convertido para positivo e é exibido um alerta
  if(x < 0){
    alert("Valor negativo foi convertido para positivo");
    x = x * -1;
  }
  
  total += Number(x);
  if(total <= 100){
    fatia.push({"valor":x,
                "offset":Number(fatia[fatiasatual].valor)+Number(fatia[fatiasatual].offset),
                "cor": "#"+((1<<24)*Math.random()|0).toString(16),
                "rotulo":nome,
                "pizza":"",
              });
    fatiasatual++;
    adicionafatia(x);
    console.log(fatia);
    console.log(ctx);
  }else{
    alert(`Valor total ${total} maior que 100`);
    total -= Number(x);
  }
  //console.log(total);
}

function adicionafatia(val){

  var x = Number(fatia[fatiasatual].offset);
      y = Number(fatia[fatiasatual].offset) + Number(val);
  ctx.fillStyle = fatia[fatiasatual].cor; //seta a cor da fatia
  
  //Desenha a fatia
  const pizza = new Path2D();
  ctx.beginPath();
  pizza.moveTo(cx, cy);
  pizza.arc(cx,cy,r,degtorad(x)*3.6,degtorad(y)*3.6,false);
  pizza.lineTo(cx, cy);
  ctx.fill(pizza);
  fatia[fatiasatual].pizza = pizza;

  //Desenha a o bloco da legenda
  const legenda = new Path2D();
  legenda.rect(200, 20*(fatiasatual), 10, 10);
  ctx.fill(legenda);
  
  //Desenha a o bloco da legenda
  ctx.fillText(`${fatia[fatiasatual].rotulo}: ${fatia[fatiasatual].valor}%` , 220,10+(20*(fatiasatual)));
  
  //  pizza.addEventListener("mouseover", function(){
  //   alert(fatia[fatiasatual].rotulo+": "+val+"%");
  // });
  
  // pizza.setAttribute("hover", alert(fatia[fatiasatual].rotulo+": "+val+"%"));
}

function degtorad(degrees)
{
  var pi = Math.PI;
  return degrees * (pi/180);
}

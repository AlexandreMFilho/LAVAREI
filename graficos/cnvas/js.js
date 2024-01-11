var fatiasatual =0, total = 0;
var fatia = [{"valor":0,"offset":0,"cor":"#000000","rotulo":"","pizza":""}];
var cx = 100, cy = 75, r = 50;

function adicionafatia(){
  var x = document.getElementsByClassName("item")[0].value;
  var nome = document.getElementsByClassName("nome")[0].value;
  total = total + Number(x);
  if(x < 0){
    alert("Valor negativo");
    // horarioOuAntiHorario = true;
  }else{
    horarioOuAntiHorario = false;
  }
  if(total <= 100){
    fatia.push({"valor":x,
                "offset":Number(fatia[fatiasatual].valor)+Number(fatia[fatiasatual].offset),
                "cor": "#"+((1<<24)*Math.random()|0).toString(16),
                "rotulo":nome,
              });
    fatiasatual++;
    D(x);
    console.log(fatia);
  }else{
    alert("Valor total maior que 100");
  }
}

function D(val){
  canvas = document.getElementById("myChart");
  // canvas.setAttribute("onclick", alert(fatia[fatiasatual].rotulo+": "+val+"%"));
  var x = Number(fatia[fatiasatual].offset);
      y = Number(fatia[fatiasatual].offset) + Number(val);
  ctx = canvas.getContext("2d");
  ctx.fillStyle = fatia[fatiasatual].cor;
  const pizza = new Path2D();
  ctx.beginPath();
  pizza.moveTo(cx, cy);
  pizza.arc(cx,cy,r,degrees_to_radians(x)*3.6,degrees_to_radians(y)*3.6,horarioOuAntiHorario);
  pizza.lineTo(cx, cy);
  ctx.fill(pizza);
  fatia[fatiasatual].pizza = pizza;

  const legenda = new Path2D();
  legenda.rect(200, 20*(fatiasatual), 10, 10);
  ctx.fill(legenda);
  
  ctx.font = "18px serif";
  ctx.fillText(`${fatia[fatiasatual].rotulo}: ${fatia[fatiasatual].valor}%` , 220,10+(20*(fatiasatual)));
  
  //  pizza.addEventListener("mouseover", function(){
  //   alert(fatia[fatiasatual].rotulo+": "+val+"%");
  // });
  
  // pizza.setAttribute("hover", alert(fatia[fatiasatual].rotulo+": "+val+"%"));
}
function regra3(x){
  return ((x*126)/100.0)
}

function degrees_to_radians(degrees)
{
  var pi = Math.PI;
  return degrees * (pi/180);
}

console.log(degrees_to_radians(45));

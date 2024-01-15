var fatiasatual = 0, total = 0;
var pizza = [];
              
var cx = 100, cy = 75, r = 50;

const fatia={
  valor:0,
  offset:0,
  cor:"#000000",
  rotulo:"",
  construtor: function(){
    this.valor = 0;
    this.offset = 0;
    this.cor = "#000000";//"#"+((1<<24)*Math.random()|0).toString(16);
    this.rotulo = "";
    fatiasatual++;
    return this;
  }
  // ,
  // construtor: function(val,nome){
  //   this.numero = fatiasatual;
  //   this.valor = Number(val);
  //   var aux = Number(pizza[Number(this.numero)-1]);
  //   this.offset = Number(Number(aux.valor));// + Number(pizza[Number(this.numero)-1].offset);
  //   this.cor = "#"+((1<<24)*Math.random()|0).toString(16);
  //   this.rotulo = nome;
  //   fatiasatual++;
  //   return this;
  // }
  
}

  // function pizzaria(){
  //   pizza.push(new fatia.construtor());
  // }

  function pizzaria(val, nome){
    console.log(`val:${val} nome:${nome}`);

    var novafatia = new fatia.construtor();
    novafatia.valor = val;
    novafatia.cor = "#"+((1<<24)*Math.random()|0).toString(16);
    novafatia.rotulo = nome;
    
    var aux = Number(pizza[fatiasatual-1]);
    novafatia.offset = aux.valor; //+ Number(pizza[Number(aux.numero)-1].offset));
    console.log(aux);
    fatiasatual++;
    pizza.push(novafatia);
  }

  
  function adicionarFatia(){
    var val = document.getElementsByClassName("item")[0].value;
    var nam = document.getElementsByClassName("rotulo")[0].value;
    pizzaria(val,nam);
    console.log(pizza);
  }
  
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

function novafatia(valor,rotulo){
  //Aquisição de dados (valor e label)
  //var x = document.getElementsByClassName("item")[0].value;
  //var nome = document.getElementsByClassName("nome")[0].value;
  
  //Verificação de valor negativo
  //Caso seja negativo, o valor é convertido para positivo e é exibido um alerta
  // if(valor < 0){
  //   alert("Valor negativo foi convertido para positivo");
  //   valor = valor * -1;
  // }
  
  total += Number(valor);
  if(total <= 100){
    // this.offset = Number(fatia[fatiasatual].valor)+Number(fatia[fatiasatual].offset),
    this.offset = Number(pizza[fatiasatual].valor)+Number(pizza[fatiasatual].offset),
    fatiasatual++;
    //adicionafatia(valor);
    console.log(fatia);
    console.log(ctx);
  }else{
    alert(`Valor total ${total} maior que 100`);
    total -= Number(x);
  }
  console.log(total);
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
console.log(`pizza:${pizza}`);
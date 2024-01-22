var fatiasatual =0;
var fatia = [{"valor":0,"offset":0}];

function adicionafatia(){
    var x = document.getElementsByClassName("item")[0].value;
    fatia.push({"valor":x,"offset":Number(fatia[fatiasatual].valor)+Number(fatia[fatiasatual].offset)});
    adicionapizza(x);
    fatiasatual++;
    console.log(fatia);
}

function adicionapizza(x){
    var svg = document.getElementsByTagName("svg")[0];
    var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "50%");
    circle.setAttribute("cy", "50%");
    circle.setAttribute("r", "20%");
    circle.setAttribute("class", `circulo fatia${fatiasatual+1}`);
    circle.setAttribute("style", 
        `stroke-dasharray: ${regra3(fatia[fatiasatual+1].valor)},200%;
         stroke-dashoffset: ${regra3((fatia[fatiasatual+1].offset)*(-1))}`);
    svg.appendChild(circle);

};

function mudaX(x,nivel){
    document.documentElement.style.setProperty(`--valor${nivel}`, x)
}
function regra3(x){
    return ((x*126)/100.0)
}


function cansado(){
    var a = [{valor:10,rotulo:"a"},{valor:10,rotulo:"b"},{valor:20,rotulo:"c"},{valor:20,rotulo:"d"},{valor:20,rotulo:"e"},{valor:20,rotulo:"f"}];
    pedido(a);
  }
cansado();
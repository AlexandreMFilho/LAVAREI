var fatiasatual =0;
var fatia = [{"valor":0,"offset":0}];
var cx = 100, cy = 75, r = 50;

function adicionafatia(){
  var x = document.getElementsByClassName("item")[0].value;
  fatia.push({"valor":x,"offset":Number(fatia[fatiasatual].valor)+Number(fatia[fatiasatual].offset)});
  D(x*3.6);
  fatiasatual++;
  console.log(fatia);
}

function D(val){
  canvas = document.getElementById("myChart");

  // canvas.setAttribute("class", `fatia${fatiasatual+1}`); //TODO testar com innerHTML
  
  
  if(canvas.getContext){
    ctx = canvas.getContext("2d");
    var x = 0, 
        y = degrees_to_radians(val);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx,cy,r,x,y);
    ctx.lineTo(cx, cy);
    ctx.fillStyle = "#"+((1<<24)*Math.random()|0).toString(16);
    ctx.fill();

  }
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

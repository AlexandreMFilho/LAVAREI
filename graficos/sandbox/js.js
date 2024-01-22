var view = new Concrete.Viewport();
var scene = view.scene;

    var layer = new Concrete.Layer();
    layer.scene.context.fillStyle = "red";
    layer.scene.context.fillRect(0, 0, 50, 50);

view.add(layer);
view.render();
view.setSize(400, 200);

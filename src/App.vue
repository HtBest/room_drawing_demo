<script lang="ts">
import konvaPlugin from "vue-konva";
import HelloWorld from "./components/HelloWorld.vue";
import Konva from "konva";
import * as drawing from "./drawing";
import { Group } from "konva/lib/Group";
import { Shape, ShapeConfig } from "konva/lib/Shape";
export default {
  data() {
    return {
      configKonva: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      current: {
        focus: { x: 0, y: 0 },
        points: [] as { x: number; y: number }[],
      },
      list: [] as drawing.Shape[],
      layer: {} as Konva.Layer,
      status: 1, //1:draw,2:split,
      showFocus: false,
    };
  },
  methods: {
    stringToColour(str: string) {
      var hash = 0;
      for (var i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      var colour = "#";
      for (var i = 0; i < 3; i++) {
        var value = (hash >> (i * 8)) & 0xff;
        colour += ("00" + value.toString(16)).substr(-2);
      }
      return colour;
    },
    makePoint(id: string) {
      const item: drawing.Shape = this.list.filter(
        (x) => x.id === id && x.type === "Point"
      )[0] as drawing.Point;
      return {
        x: item.x,
        y: item.y,
        radius: 1,
        fill: "black",
        id: id,
      };
    },
    // makeLine(id:string){
    //   const item:drawing.Shape=this.list.filter((x)=>x.id===id&& x.type==='Line')[0]as drawing.Line ;
    //   return {x:item.x,y:item.y,radius:10,fill:'red',draggable:true,id:id,};
    // },
    makePolygon(id: string) {
      const item: drawing.Shape = this.list.filter(
        (x) => x.id === id && x.type === "Polygon"
      )[0] as drawing.Polygon;
      let points = item.toPoints().map((x) => [x.x, x.y]);
      return {
        points: points.reduce((a, b) => a.concat(b)),
        opacity: 0.3,
        fill: this.stringToColour(id),
        // stroke: "black",
        // strokeWidth: 1,
        closed: true,
      };
    },
    closestFocus() {
      let pos = this.layer.getRelativePointerPosition()!;
      let focus = { x: -1, y: -1 };
      let shape: drawing.Line | drawing.Point | null =
        drawing.dataStore.closestLine(pos.x, pos.y);
      if (shape) {
        if (shape.distance(new drawing.Point(pos.x, pos.y)) < 4) {
          focus = shape.projection(new drawing.Point(pos.x, pos.y));
        }
      }
      shape = drawing.dataStore.closestPoint(pos.x, pos.y);
      if (shape) {
        if (shape.distance(new drawing.Point(pos.x, pos.y)) < 5) {
          focus = { x: shape.x, y: shape.y };
        }
      }
      return focus;
    },
    draw() {
      this.layer.destroyChildren();
      const img = new Image();
      img.onload = () => {
        this.layer.batchDraw();
      };
      img.src = "../30b1e56b-905d-4b24-b850-ee330bd1cbbb.jpg";
      let bgImg = new Konva.Image({
        x: 0,
        y: 0,
        width: window.innerWidth,
        height: window.innerHeight,
        image: img,
      });
      this.layer.add(bgImg);
      this.list = drawing.dataStore.generateDrawing();
      this.list.forEach((item) => {
        if (item.type === "Point") {
          this.layer.add(new Konva.Circle(this.makePoint(item.id)));
        } else if (item.type === "Line") {
          // group.add(shape);
        } else if (item.type === "Polygon") {
          this.layer.add(new Konva.Line(this.makePolygon(item.id)));
        }
      });
      if (this.current.points.length > 0)
        this.layer.add(
          new Konva.Line({
            points: this.current.points
              .map((x) => [x.x, x.y])
              .reduce((a, b) => a.concat(b)),
            fill: "blue",
            opacity: this.status === 1 ? 0.1 : 1,
            stroke: this.status === 1 ? "black" : "grey",
            strokeWidth: 1,
            closed: this.status === 1 ? true : false,
          })
        );
      // console.log(this.current.points.length);
      this.current.points.forEach((item) => {
        this.layer.add(
          new Konva.Circle({
            x: item.x,
            y: item.y,
            fill: this.status === 1 ? "orange" : "green",
            radius: 1,
          })
        );
      });

      //focus
      if (this.showFocus) {
        this.layer.add(
          new Konva.Circle({
            x: this.current.focus.x,
            y: this.current.focus.y,
            fill: this.status === 1 ? "orange" : "green",
            radius: 1,
          })
        );
      }
    },
  },
  mounted() {
    drawing.dataStore.init();
    const self = this;
    let stage = new Konva.Stage({
      container: "container",
      width: window.innerWidth,
      height: window.innerHeight,
      x: 20,
      y: 50,
    });

    let layer = new Konva.Layer({ clearBeforeDraw: true });
    self.layer = layer;
    stage.add(layer);

    // let group = new Konva.Group({
    //   x: 30,
    //   rotation: 10,
    //   scaleX: 1.5,
    // });
    // layer.add(group);

    // let text = new Konva.Text({
    //   text: "Click on the canvas to draw a circle",
    //   fontSize: 20,
    // });
    // group.add(text);
    stage.on("mousedown", function (evt) {
      if (evt.evt.button === 0) {
        if (self.status === 1) {
          let pos = layer.getRelativePointerPosition();
          if (self.current.points.length === 0) {
            self.current.points.push({
              x: self.current.focus.x,
              y: self.current.focus.y,
            });
          }
          self.current.points.push({
            x: self.current.focus.x,
            y: self.current.focus.y,
          });
          self.draw();
        } else if (self.status === 2) {
          if (self.current.focus.x === -1 && self.current.focus.y === -1) {
            return;
          }
          let pos = layer.getRelativePointerPosition();
          if (self.current.points.length === 0) {
            self.current.points.push({
              x: self.current.focus.x,
              y: self.current.focus.y,
            });
          } else {
            let focus = self.closestFocus();
            if (focus.x !== -1 && focus.y !== -1) {
              drawing.dataStore.split(self.current.points);
              self.current.points = [];
              self.draw();
              return;
            }
          }
          self.current.points.push({
            x: self.current.focus.x,
            y: self.current.focus.y,
          });
          self.draw();
        }
      }
      // else if (evt.evt.button === 2) {
      //   if (self.current.points.length === 0) return;
      //   console.log(self.current.points.length);
      //   self.current.points.pop();
      //   drawing.dataStore.addPolygon(self.current.points);
      //   self.current.points = [];
      //   self.draw();
      // }
    });
    stage.on("mousemove", function () {
      let pos = layer.getRelativePointerPosition()!;

      // calculate focus
      let focus = self.closestFocus();
      if (focus.x === -1 && focus.y === -1)
        focus =
          self.status === 1 || self.current.points.length !== 0
            ? { x: pos.x, y: pos.y }
            : { x: -1, y: -1 };

      self.current.focus = { x: focus.x, y: focus.y };
      if (self.current.points.length) {
        self.current.points[self.current.points.length - 1].x = focus.x;
        self.current.points[self.current.points.length - 1].y = focus.y;
      }
      self.draw();
    });
    window.addEventListener("keydown", function (evt) {
      if (evt.code === "Digit1") {
        if (self.current.points.length < 4 || self.status !== 1) {
          self.current.points = [];
          self.draw();
          self.status = 1;
          return;
        }
        self.current.points.pop();
        drawing.dataStore.addPolygon(self.current.points);
        self.current.points = [];
        self.draw();
      } else if (evt.code === "Digit2") {
        if (self.current.points.length < 3 || self.status !== 2) {
          self.current.points = [];
          self.draw();
          self.status = 2;
          return;
        }
        self.current.points.pop();
        drawing.dataStore.split(self.current.points);
        self.current.points = [];
        self.draw();
      } else if (evt.code === "Escape") {
        self.current.points = [];
        self.draw();
      }
      if (evt.code === "ShiftLeft") {
        self.showFocus = true;
        self.draw();
      }
    });
    window.addEventListener("keyup", function (evt) {
      if (evt.code === "ShiftLeft") {
        self.showFocus = false;
        self.draw();
      }
    });
    // stage.on("contextmenu", function () {});

    self.draw();
  },
};
</script>
<template>
  <div id="container"></div>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>

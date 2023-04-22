import { assert } from "@vue/compiler-core";
import { v4 as uuid } from "uuid";

export {};
type ID = string;
class ShapeObject {
  id: ID;
  father: { [key: ID]: any };
  children: { [key: ID]: any };
  container: { [key: ID]: Line | Polygon }; // who has this ShapeObject
  type: "ShapeObject" | "Point" | "Line" | "Polygon";
  event(event: any) {}
  constructor(id: ID = uuid()) {
    this.id = id;
    this.father = {};
    this.children = {};
    this.container = {};
    this.type = "ShapeObject";
  }
}
export class Point extends ShapeObject {
  x: number;
  y: number;
  type: "Point";

  constructor(x: number, y: number, id: ID = uuid()) {
    super(id);
    this.x = x;
    this.y = y;
    this.type = "Point";
  }
  event(event: any) {
    if (event.type === "move") {
      this.x += event.dx;
      this.y += event.dy;
    }
  }
  distance(point: Point) {
    return Math.sqrt((this.x - point.x) ** 2 + (this.y - point.y) ** 2);
  }
}
export class Line extends ShapeObject {
  start: Point;
  end: Point;
  type: "Line";
  constructor(start: Point, end: Point, id: ID = uuid()) {
    super(id);
    this.start = start;
    this.end = end;
    this.end.container[this.id] = this;
    this.start.container[this.id] = this;
    this.type = "Line";
  }
  event(event: any) {
    if (event.type === "move") {
      this.start.event(event);
      this.end.event(event);
    }
  }
  distance(point: Point) {
    let a = this.end.y - this.start.y;
    let b = this.start.x - this.end.x;
    let c = this.end.x * this.start.y - this.start.x * this.end.y;
    let distance =
      Math.abs(a * point.x + b * point.y + c) / Math.sqrt(a * a + b * b);
    // if projection is not on the line, return the distance to the closest point
    let projection = this.projection(point);
    if (
      Math.min(this.start.x, this.end.x) > projection.x ||
      Math.max(this.start.x, this.end.x) < projection.x ||
      Math.min(this.start.y, this.end.y) > projection.y ||
      Math.max(this.start.y, this.end.y) < projection.y
    )
      return Math.min(point.distance(this.start), point.distance(this.end));
    return distance;
  }
  projection(point: Point) {
    let a = this.end.y - this.start.y;
    let b = this.start.x - this.end.x;
    let c = this.end.x * this.start.y - this.start.x * this.end.y;
    let x = (b * (b * point.x - a * point.y) - a * c) / (a * a + b * b);
    let y = (a * (-b * point.x + a * point.y) - b * c) / (a * a + b * b);
    x = Math.round(x);
    y = Math.round(y);
    return new Point(x, y);
  }
}
export class Polygon extends ShapeObject {
  lines: Line[];
  type: "Polygon";
  constructor(lines: Line[], id: ID = uuid()) {
    super(id);
    this.lines = lines;
    this.type = "Polygon";
    for (let i = 0; i < lines.length; i++) {
      lines[i].container[this.id] = this;
    }
  }
  event(event: any) {
    if (event.type === "move") {
      for (let i = 0; i < this.lines.length; i++) {
        this.lines[i].event(event);
      }
    }
  }
  inPolygon(point: Point) {
    let count = 0;
    for (let i = 0; i < this.lines.length; i++) {
      let line = this.lines[i];
      if (line.start.y === line.end.y) continue;
      if (point.y < Math.min(line.start.y, line.end.y)) continue;
      if (point.y >= Math.max(line.start.y, line.end.y)) continue;
      let x =
        ((point.y - line.start.y) * (line.end.x - line.start.x)) /
          (line.end.y - line.start.y) +
        line.start.x;
      if (x > point.x) count++;
    }
    return count % 2 === 1;
  }
  toPoints() {
    let points: Point[] = [];
    for (let i = 0; i < this.lines.length; i++) {
      let next = this.lines[(i + 1) % this.lines.length];
      points.push(
        this.isInverseLine(i) ? this.lines[i].end : this.lines[i].start
      );
    }
    return points;
  }
  isInverseLine(index: number) {
    let line = this.lines[index];
    let next = this.lines[(index + 1) % this.lines.length];
    return line.start === next.start || line.start === next.end;
  }
}
export type Shape = Point | Line | Polygon;
class DataStore {
  points: { [key: string]: Point };
  lines: { [key: string]: Line };
  polygons: { [key: string]: Polygon };
  constructor() {
    this.points = {};
    this.lines = {};
    this.polygons = {};
  }
  addPoint(x: number, y: number) {
    x = Math.round(x);
    y = Math.round(y);
    let res = Object.values(this.points).find(
      (p) => p.distance(new Point(x, y)) < 2
    );
    if (res !== undefined) return res;
    let point = new Point(x, y);
    this.points[point.id] = point;
    return point;
  }
  addLine(start: { x: number; y: number }, end: { x: number; y: number }) {
    start.x = Math.round(start.x);
    start.y = Math.round(start.y);
    end.x = Math.round(end.x);
    end.y = Math.round(end.y);
    let ls1 = new Point(start.x, start.y),
      ls2 = new Point(end.x, end.y);
    let res = Object.values(this.lines).find(
      (l) =>
        (l.start.distance(ls1) < 2 && l.end.distance(ls2) < 2) ||
        (l.start.distance(ls2) < 2 && l.end.distance(ls1) < 2)
    );
    if (res !== undefined) return res;
    let line = new Line(
      this.addPoint(start.x, start.y),
      this.addPoint(end.x, end.y)
    );
    this.lines[line.id] = line;
    return line;
  }
  addPolygon(polygon: { x: number; y: number }[]): Polygon {
    //point split lines
    for (let i = 0; i < polygon.length; ++i) {
      polygon[i].x = Math.round(polygon[i].x);
      polygon[i].y = Math.round(polygon[i].y);
      let res = this.splitLines(polygon[i].x, polygon[i].y);
    }
    // assume line has not been splited
    let lines = [];
    for (let i = 0; i < polygon.length - 1; i++) {
      lines.push({ start: polygon[i], end: polygon[i + 1] });
    }
    lines.push({ start: polygon[polygon.length - 1], end: polygon[0] });
    let id = uuid();
    this.polygons[id] = new Polygon(
      lines.map((line) => {
        return this.lines[this.addLine(line.start, line.end).id];
      }),
      id
    );
    console.log(
      this.polygons[id].lines.map(
        (l) =>
          "(" +
          l.start.x +
          "," +
          l.start.y +
          ") -> (" +
          l.end.x +
          "," +
          l.end.y +
          ")"
      )
    );
    return this.polygons[id];
  }
  deletePolygon(id: ID) {
    for (let line of this.polygons[id].lines) {
      delete line.container[id];
    }
    delete this.polygons[id];
  }
  closestLine(x: number, y: number): Line | null {
    let min = 1e9;
    let minLine: Line | null = null;
    for (let key in this.lines) {
      let line = this.lines[key];
      let distance = line.distance(new Point(x, y));
      if (distance < min) {
        min = distance;
        minLine = line;
      }
    }
    return minLine;
  }
  closestPoint(x: number, y: number): Point | null {
    let min = 1e9;
    let minPoint: Point | null = null;
    for (let key in this.points) {
      let point = this.points[key];
      let distance = point.distance(new Point(x, y));
      if (distance < min) {
        min = distance;
        minPoint = point;
      }
    }
    return minPoint;
  }
  closestShape(x: number, y: number): Point | Line | null {
    const point = this.closestPoint(x, y);
    const line = this.closestLine(x, y);
    if (point === null && line === null) return null;
    if (point === null) return line;
    if (line === null) return point;
    if (point.distance(new Point(x, y)) < line.distance(new Point(x, y)))
      return line;
    return point;
  }
  splitLines(x: number, y: number): [Line, Line][] | null {
    let ls = new Point(x, y);
    let res = this.closestLine(x, y);
    if (
      res !== null &&
      res.distance(new Point(x, y)) < 2 &&
      res.start.distance(ls) > 2 &&
      res.end.distance(ls) > 2
    ) {
      let line1 = this.addLine(res.start, ls);
      let line2 = this.addLine(ls, res.end);
      for (let id in res.container) {
        let shape = res.container[id]!;
        if (shape.type === "Polygon") {
          let index = shape.lines.indexOf(res);
          shape.isInverseLine(index)
            ? shape.lines.splice(index, 1, line2, line1)
            : shape.lines.splice(index, 1, line1, line2);
          line1.container[id] = shape;
          line2.container[id] = shape;
        }
      }
      delete this.lines[res.id];
      this.lines[line1.id] = line1;
      this.lines[line2.id] = line2;
      let res2 = this.splitLines(x, y);
      let ret: [Line, Line][] = [[line1, line2]];
      if (res2 !== null) ret = ret.concat(res2);
      return ret;
    }
    return null;
  }

  inPolygon(x: number, y: number): Polygon | null {
    let res = null;
    for (let key in this.polygons) {
      let polygon = this.polygons[key];
      if (polygon.inPolygon(new Point(x, y))) {
        res = polygon;
      }
    }
    return res;
  }
  split(points: { x: number; y: number }[]) {
    //midpoint
    if (points.length < 2) return;
    let mid = {
      x: (points[0].x + points[1].x) / 2,
      y: (points[0].y + points[1].y) / 2,
    };
    let polygon = this.inPolygon(mid.x, mid.y);
    if (polygon === null) return;
    console.log("这次插入的点:", JSON.stringify(points));
    let lines1 = this.splitLines(points[0].x, points[0].y)!;
    let lines2 = this.splitLines(points.at(-1)!.x, points.at(-1)!.y)!;
    assert(lines1?.length === 1 && lines2?.length === 1);
    let points1: { x: number; y: number }[] = [];
    let points2: { x: number; y: number }[] = [];
    console.log(
      "多边形为:",
      JSON.stringify(
        polygon.lines.map((line) => ({
          start: { x: line.start.x, y: line.start.y },
          end: { x: line.end.x, y: line.end.y },
        }))
      )
    );
    for (let i = 0; i < polygon.lines.length; ++i) {
      let next = i === polygon.lines.length - 1 ? 0 : i + 1;
      if (
        (polygon.lines[i] === lines1[0][0] ||
          polygon.lines[i] === lines1[0][1]) &&
        polygon.lines[next] !== lines1[0][0] &&
        polygon.lines[next] !== lines1[0][1]
      ) {
        let now = i;
        while (1) {
          next = now === polygon.lines.length - 1 ? 0 : now + 1;
          let startpoint = polygon.isInverseLine(now)
            ? polygon.lines[now].end
            : polygon.lines[now].start;
          points1.push({
            x: startpoint.x,
            y: startpoint.y,
          });
          if (
            polygon.lines[now] === lines2[0][0] ||
            polygon.lines[now] === lines2[0][1]
          ) {
            now = next;
            break;
          }
          now = next;
        }
        for (let j = points.length - 1; j; --j) {
          points1.push(points[j]);
          console.log("插入", points[j].x, points[j].y);
        }
        for (let j = 0; j < points.length - 1; ++j) {
          points2.push(points[j]);
        }
        while (1) {
          next = now === polygon.lines.length - 1 ? 0 : now + 1;
          let startpoint =
            polygon.lines[now].start === polygon.lines[next].start ||
            polygon.lines[now].start === polygon.lines[next].end
              ? polygon.lines[now].end
              : polygon.lines[now].start;
          points2.push({
            x: startpoint.x,
            y: startpoint.y,
          });
          if (
            polygon.lines[now] === lines1[0][0] ||
            polygon.lines[now] === lines1[0][1]
          ) {
            break;
          }
          now = next;
        }
        console.log(JSON.stringify(points1));
        console.log(JSON.stringify(points2));
        break;
      }
    }
    this.deletePolygon(polygon.id);
    this.addPolygon(points1);
    this.addPolygon(points2);

    console.log(this.polygons);
  }
  init() {
    let p1 = new Point(10, 10);
    let p2 = new Point(100, 10);
    let p3 = new Point(100, 100);
    let p4 = new Point(10, 100);
    let l1 = new Line(p1, p2);
    let l2 = new Line(p2, p3);
    let l3 = new Line(p3, p4);
    let l4 = new Line(p4, p1);
    let polygon = new Polygon([l1, l2, l3, l4]);
    this.addPoint(p1.x, p1.y);
    this.addPoint(p2.x, p2.y);
    this.addPoint(p3.x, p3.y);
    this.addPoint(p4.x, p4.y);
    this.addLine(l1.start, l1.end);
    this.addLine(l2.start, l2.end);
    this.addLine(l3.start, l3.end);
    this.addLine(l4.start, l4.end);
    this.addPolygon(
      polygon.lines.map((line) => ({ x: line.start.x, y: line.start.y }))
    );
  }

  generateDrawing(): Shape[] {
    let drawing: Shape[] = [];
    for (let key in this.polygons) {
      drawing.push(this.polygons[key]);
    }
    for (let key in this.lines) {
      drawing.push(this.lines[key]);
    }
    for (let key in this.points) {
      drawing.push(this.points[key]);
    }
    return drawing;
  }
}
export let dataStore = new DataStore();

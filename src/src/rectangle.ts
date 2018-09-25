import {Point} from './point';
import {Size} from './size';

export class Rectangle {

  public x: number;
  public y: number;
  public width: number;
  public height: number;

  public static fromLTRB(left: number, top: number, right: number, bottom: number): Rectangle {
    return new Rectangle(left, top, right - left, bottom - top);
  }

  public static union(rc: Rectangle, ...args: Rectangle[]): Rectangle {
    let l = rc.left;
    let t = rc.top;
    let r = rc.right;
    let b = rc.bottom;
    for (let arg of args) {
      l = Math.min(l, arg.left);
      t = Math.min(t, arg.top);
      r = Math.max(l, arg.right);
      b = Math.max(t, arg.bottom);
    }
    return Rectangle.fromLTRB(l, t, r, b);
  }

  public constructor(x: number, y: number, width: number, height: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  public clone(): Rectangle {
    return new Rectangle(this.x, this.y, this.width, this.height);
  }

  public get left(): number {
    if (this.width < 0)
      return this.x + this.width + 1;
    else
      return this.x;
  }

  public get top(): number {
    if (this.height < 0)
      return this.y + this.height + 1;
    else
      return this.y;
  }

  public get right(): number {
    if (this.width < 0)
      return this.x;
    else
      return this.x + this.width - 1;
  }

  public get bottom(): number {
    if (this.height < 0)
      return this.y;
    else
      return this.y + this.height - 1;
  }

  public isEmpty(): boolean {
    return this.width === 0 && this.height === 0;
  }

  public getPoint(): Point {
    return new Point(this.x, this.y);
  }

  public getSize(): Size {
    return new Size(this.width, this.height);
  }

  public getCenter(): Point {
    return new Point(this.x + this.width / 2, this.y + this.height / 2);
  }

  public offset(x: number, y: number): void {
    this.x += x;
    this.y += y;
  }

  public inflate(width: number, height: number): void {
    this.width += width;
    this.height += height;
  }

  public contains(pt: Point): boolean;
  public contains(rc: Rectangle): boolean;
  public contains(x: number, y: number): boolean;
  public contains(x: any, y?: number): boolean {
    if (y != null) {
      return x >= this.left && x <= this.right && y >= this.top && y <= this.bottom;
    } else if (x.left != null) {
      return x.left >= this.left && x.top >= this.top && x.right <= this.right && x.bottom <= this.bottom;
    } else if (x.x != null) {
      return x.x >= this.left && x.x <= this.right && x.y >= this.top && x.y <= this.bottom;
    } else {
      throw new Error('型が一致しませんねん。');
    }
  }

  public normalize(): Rectangle {
    return Rectangle.fromLTRB(this.left, this.top, this.right, this.bottom);
  }

}

export class Point {

    public x: number;
    public y: number;

    public constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    public equals(other: Point): boolean {
        return this.x === other.x && this.y === other.y;
    }

    public distance(): number {
        return Math.sqrt(this.x * 2 + this.y * 2);
    }

}

export class Size {

  public width: number;
  public height: number;
  
  public constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
  
  public equals(other: Size): boolean {
    return this.width === other.width && this.height === other.height;
  }

}

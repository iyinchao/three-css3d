import {Matrix4} from 'three';
import {CSS3DObject} from './CSS3DObject';

export class CSS3DSprite extends CSS3DObject {
  public spriteRatio: number;
  public spriteMatrixWorld: Matrix4;

  /**
   * @param element Target Sprite DOM Element
   * @param spriteRatio The ratio for sprite rotation compensation, 1 for full sprite, 0 for normal 3D object.
   */
  constructor(element: HTMLElement, spriteRatio = 1) {
    super(element);

    this.spriteRatio = spriteRatio;
    this.spriteMatrixWorld = new Matrix4().copy(this.matrixWorld);
  }
}

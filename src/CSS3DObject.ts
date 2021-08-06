import {Object3D} from 'three';

export class CSS3DObject extends Object3D {
  public element: HTMLElement;

  /**
   * @param element Target Sprite DOM Element
   */
  constructor(element: HTMLElement) {
    super();

    this.element = element;
    this.element.style.position = 'absolute';
    this.element.style.pointerEvents = 'auto';

    this.addEventListener('removed', () => {
      this.traverse((object: Object3D) => {
        if (
          object instanceof CSS3DObject &&
          object.element instanceof Element &&
          object.element.parentNode !== null
        ) {
          object.element.parentNode.removeChild(object.element);
        }
      });
    });
  }

  /**
   * Copy content from another CSS3DObject.
   * @param source Source CSS3DObject
   * @param recursive
   * @returns CSS3DObject
   */
  copy(source: CSS3DObject, recursive?: boolean) {
    Object3D.prototype.copy.call(this, source, recursive);

    this.element = source.element.cloneNode(true) as HTMLElement;

    return this;
  }
}

import {
  Object3D,
  EventDispatcher,
  Matrix4,
  Scene,
  Camera,
  OrthographicCamera,
  Vector3,
  Quaternion,
} from 'three';
import {CSS3DObject} from './CSS3DObject';
import {CSS3DSprite} from './CSS3DSprite';

interface ObjectCache {
  style: string;
  distanceToCameraSquared?: number;
}

export class CSS3DRenderer extends EventDispatcher {
  public domElement: HTMLElement;
  public readonly cameraElement: HTMLElement;

  private _width = 0;
  private _height = 0;
  private _widthHalf = 0;
  private _heightHalf = 0;
  private matrix = new Matrix4();
  private _spriteQuat = new Quaternion();
  private _objectQuat = new Quaternion();
  private isIE: boolean;
  private cache = {
    camera: {fov: 0, style: ''},
    objects: new WeakMap<CSS3DObject, ObjectCache>(),
  };
  private getDistanceToSquared = (function () {
    const a = new Vector3();
    const b = new Vector3();

    return function (object1: Object3D, object2: Object3D) {
      a.setFromMatrixPosition(object1.matrixWorld);
      b.setFromMatrixPosition(object2.matrixWorld);

      return a.distanceToSquared(b);
    };
  })();

  constructor() {
    super();

    const domElement = document.createElement('div');
    this.domElement = domElement;
    domElement.style.overflow = 'hidden';

    const cameraElement = document.createElement('div');
    this.cameraElement = cameraElement;
    cameraElement.style.transformStyle = 'preserve-3d';

    domElement.appendChild(cameraElement);

    this.isIE = /Trident/i.test(navigator.userAgent);
  }

  setClearColor() {
    /* noop */
  }

  getSize() {
    return {
      width: this._width,
      height: this._height,
    };
  }

  setSize(width: number, height: number) {
    this._width = width;
    this._height = height;
    this._widthHalf = this._width / 2;
    this._heightHalf = this._height / 2;

    this.domElement.style.width = `${width}px`;
    this.domElement.style.height = `${height}px`;

    this.cameraElement.style.width = `${width}px`;
    this.cameraElement.style.height = `${height}px`;
  }

  epsilon = (value: number) => (Math.abs(value) < 1e-10 ? 0 : value);

  getCameraCSSMatrix = (martrix: Matrix4, camera: Camera, fov: number) => {
    const {epsilon} = this;
    const {elements} = martrix;

    // prettier-ignore
    const matrixCSS = `matrix3d(${
       epsilon(elements[0])},${
       epsilon(- elements[1])},${
       epsilon(elements[2])},${
       epsilon(elements[3])},${
       epsilon(elements[4])},${
       epsilon(- elements[5])},${
       epsilon(elements[6])},${
       epsilon(elements[7])},${
       epsilon(elements[8])},${
       epsilon(- elements[9])},${
       epsilon(elements[10])},${
       epsilon(elements[11])},${
       epsilon(elements[12])},${
       epsilon(- elements[13])},${
       epsilon(elements[14])},${
       epsilon(elements[15])
     })`;

    if (camera instanceof OrthographicCamera) {
      const tx = -(camera.right + camera.left) / 2;
      const ty = (camera.top + camera.bottom) / 2;

      return `scale(${fov})translate(${epsilon(tx)}px,${epsilon(
        ty
      )}px)${matrixCSS}`;
    }

    return `translateZ(${fov}px)${matrixCSS}`;
  };

  getObjectCSSMatrix = (matrix: Matrix4, cameraCSSMatrix: string) => {
    const {epsilon} = this;
    const {elements} = matrix;

    // prettier-ignore
    const matrix3d = `matrix3d(${
       epsilon(elements[0])},${
       epsilon(elements[1])},${
       epsilon(elements[2])},${
       epsilon(elements[3])},${
       epsilon(-elements[4])},${
       epsilon(-elements[5])},${
       epsilon(-elements[6])},${
       epsilon(-elements[7])},${
       epsilon(elements[8])},${
       epsilon(elements[9])},${
       epsilon(elements[10])},${
       epsilon(elements[11])},${
       epsilon(elements[12])},${
       epsilon(elements[13])},${
       epsilon(elements[14])},${
       epsilon(elements[15])})`;

    // prettier-ignore
    if (this.isIE) {
       return `translate(-50%,-50%)translate(${
         this._widthHalf
       }px,${
         this._heightHalf
       }px)${
         cameraCSSMatrix
       }${
         matrix3d
       }`;
     }

    return `translate(-50%,-50%)${matrix3d}`;
  };

  zOrder(scene: Scene) {
    const {cache} = this;

    const items: {
      object: CSS3DObject;
      data: ObjectCache;
    }[] = [];

    scene.traverse(obj => {
      const object = obj as CSS3DObject;
      if (cache.objects.has(object)) {
        items.push({
          object,
          data: cache.objects.get(object)!,
        });
      }
    });

    const order = items.sort(
      (a, b) =>
        // Only for IE, property is guaranteed to exist
        a.data.distanceToCameraSquared! - b.data.distanceToCameraSquared!
    );
    const zMax = order.length;
    order.forEach((info, index) => {
      const {object} = info;

      (object as CSS3DObject).element.style.zIndex = `${zMax - index}`;
    });
  }

  renderObject = (
    object: Object3D,
    scene: Scene,
    camera: Camera | OrthographicCamera,
    cameraCSSMatrix: string
  ) => {
    const {
      matrix,
      getObjectCSSMatrix,
      cache,
      cameraElement,
      renderObject,
      isIE,
      getDistanceToSquared,
    } = this;
    if (object instanceof CSS3DObject) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (object.onBeforeRender as any)(this, scene, camera);

      let style;

      if (object instanceof CSS3DSprite) {
        // http://swiftcoder.wordpress.com/2008/11/25/constructing-a-billboard-matrix/

        matrix.copy(camera.matrixWorldInverse);
        // Get the inverse transforms
        matrix.transpose();

        // NOTE: The euler interp is probably cause Gimbal lock
        // Convert the rotation part to euler to merge by ratio
        // this._spriteEuler.setFromRotationMatrix(matrix); // camera inverse part
        // this._objectEuler.setFromRotationMatrix(object.matrixWorld); // object rotation part

        // this._spriteEuler.x = this._spriteEuler.x * object.spriteRatio + this._objectEuler.x * (1 - object.spriteRatio);
        // this._spriteEuler.y = this._spriteEuler.y * object.spriteRatio + this._objectEuler.y * (1 - object.spriteRatio);
        // this._spriteEuler.z = this._spriteEuler.z * object.spriteRatio + this._objectEuler.z * (1 - object.spriteRatio);
        // matrix.makeRotationFromEuler(this._spriteEuler);

        this._spriteQuat.setFromRotationMatrix(matrix);
        this._objectQuat.setFromRotationMatrix(object.matrixWorld);
        this._objectQuat.slerp(this._spriteQuat, object.spriteRatio);
        matrix.makeRotationFromQuaternion(this._objectQuat);

        matrix.copyPosition(object.matrixWorld);
        matrix.scale(object.scale);

        matrix.elements[3] = 0;
        matrix.elements[7] = 0;
        matrix.elements[11] = 0;
        matrix.elements[15] = 1;

        // save current computed sprite matrix
        object.spriteMatrixWorld.copy(matrix);

        style = getObjectCSSMatrix(matrix, cameraCSSMatrix);
      } else {
        style = getObjectCSSMatrix(object.matrixWorld, cameraCSSMatrix);
      }

      const {element} = object;
      const cachedObject = cache.objects.get(object);

      if (cachedObject === undefined || cachedObject.style !== style) {
        element.style.transform = style;

        const objectData: ObjectCache = {style};
        cache.objects.set(object, objectData);

        if (isIE) {
          objectData.distanceToCameraSquared = getDistanceToSquared(
            camera,
            object
          );
        }
      }

      element.style.display = object.visible ? '' : 'none';

      if (element.parentNode !== cameraElement) {
        cameraElement.appendChild(element);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (object.onAfterRender as any)(this, scene, camera);
    }

    for (let i = 0, l = object.children.length; i < l; i++) {
      renderObject(object.children[i], scene, camera, cameraCSSMatrix);
    }
  };

  render(scene: Scene, camera: Camera | OrthographicCamera) {
    const {
      _heightHalf,
      _widthHalf,
      isIE,
      cameraElement,
      cache,
      domElement,
      getCameraCSSMatrix,
      zOrder,
      renderObject,
    } = this;

    const fov = camera.projectionMatrix.elements[5] * _heightHalf;

    if (cache.camera.fov !== fov) {
      domElement.style.perspective = `${fov}px`;

      cache.camera.fov = fov;
    }

    if (scene.autoUpdate === true) scene.updateMatrixWorld();
    if (camera.parent === null) camera.updateMatrixWorld();

    const cameraCSSMatrix = getCameraCSSMatrix(
      camera.matrixWorldInverse,
      camera,
      fov
    );

    const style = `${cameraCSSMatrix}translate(${_widthHalf}px,${_heightHalf}px)`;

    if (cache.camera.style !== style && !isIE) {
      cameraElement.style.transform = style;

      cache.camera.style = style;
    }

    renderObject(scene, scene, camera, cameraCSSMatrix);

    if (isIE) {
      // IE10 and 11 does not support 'preserve-3d'.
      // Thus, z-order in 3D will not work.
      // We have to calc z-order manually and set CSS z-index for IE.
      // FYI: z-index can't handle object intersection
      zOrder(scene);
    }
  }
}

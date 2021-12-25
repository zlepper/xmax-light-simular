import { startWorkerProvider } from '@zlepper/rpc';
import { WebWorkerServerConnection } from '@zlepper/web-worker-rpc';
import {
  BoxGeometry,
  BufferGeometry,
  DirectionalLight,
  Material,
  Mesh,
  MeshPhongMaterial,
  OffscreenCanvas,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';

interface RenderSize {
  height: number;
  width: number;
}

export class TreeLightRenderer {
  private renderSize: RenderSize = { height: 100, width: 100 };
  private renderer: WebGLRenderer;
  private camera: PerspectiveCamera;
  private scene: Scene;

  constructor(private canvas: OffscreenCanvas) {}

  initialize() {
    console.log('initializing worker');
    this.renderer = this.createRenderer();
    this.camera = this.createCamera();

    this.scene = new Scene();
    const cube = this.createCube();

    this.scene.add(cube);

    const light = this.createLight();
    this.scene.add(light);
    this.initializeRendering(cube);
  }

  private initializeRendering(cube: Mesh) {
    this.renderer.render(this.scene, this.camera);

    const render = (time) => {
      time *= 0.001;

      if (this.resizeRendererToDisplaySize(this.renderer)) {
        this.camera.aspect = this.renderSize.width / this.renderSize.height;
        this.camera.updateProjectionMatrix();
      }

      cube.rotation.x = time;
      cube.rotation.y = time;

      this.renderer.render(this.scene, this.camera);

      requestAnimationFrame(render);
    };

    requestAnimationFrame(render);
  }

  private createLight(): DirectionalLight {
    const color = 0xffffff;
    const intensity = 1;
    const light = new DirectionalLight(color, intensity);
    light.position.set(-1, 2, 4);
    return light;
  }

  private createCube(): Mesh {
    const boxWidth = 1;
    const boxHeight = 1;
    const boxDepth = 1;
    const geometry = new BoxGeometry(boxWidth, boxHeight, boxDepth);

    const material = new MeshPhongMaterial({
      color: 0x44aa88,
    });

    return new Mesh(geometry, material);
  }

  private createCamera(): PerspectiveCamera {
    const fov = 75;
    const aspect = 2;
    const near = 0.1;
    const far = 5;
    const camera = new PerspectiveCamera(fov, aspect, near, far);

    camera.position.z = 2;
    return camera;
  }

  private createRenderer(): WebGLRenderer {
    return new WebGLRenderer({
      canvas: this.canvas,
    });
  }

  public updateScreenSize(size: RenderSize) {
    this.renderSize = size;
  }

  private resizeRendererToDisplaySize(renderer: WebGLRenderer): boolean {
    const canvas = renderer.domElement;
    const needResize =
      canvas.width !== this.renderSize.width ||
      canvas.height !== this.renderSize.height;
    if (needResize) {
      renderer.setSize(this.renderSize.width, this.renderSize.height, false);
    }
    return needResize;
  }
}

function initialize(ev: MessageEvent) {
  const canvas = ev.data.canvas;

  removeEventListener('message', initialize);

  const connection = new WebWorkerServerConnection();
  startWorkerProvider(new TreeLightRenderer(canvas), connection);
}

addEventListener('message', initialize);

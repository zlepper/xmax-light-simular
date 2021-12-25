import { startWorkerProvider } from '@zlepper/rpc';
import { WebWorkerServerConnection } from '@zlepper/web-worker-rpc';
import {
  BoxGeometry,
  BufferGeometry,
  DirectionalLight,
  Light,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshPhongMaterial,
  OffscreenCanvas,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  WebGLRenderer,
} from 'three';
import { LightStructure, parseLightStructure } from '../models/light-structure';

interface RenderSize {
  height: number;
  width: number;
}

const RENDER_SCALE = 100;

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
    this.addLight();

    this.initializeRendering();
  }

  private addLight() {
    const light = new DirectionalLight(0xffffff, 1);
    light.position.set(this.camera.position.x, this.camera.position.y, this.camera.position.z);
    this.scene.add(light);
  }

  private initializeRendering() {
    this.renderer.render(this.scene, this.camera);

    const render = (time) => {
      time *= 0.001;

      if (this.resizeRendererToDisplaySize(this.renderer)) {
        this.camera.aspect = this.renderSize.width / this.renderSize.height;
        this.camera.updateProjectionMatrix();
      }

      this.renderer.render(this.scene, this.camera);

      requestAnimationFrame(render);
    };

    requestAnimationFrame(render);
  }

  private createCamera(): PerspectiveCamera {
    const fov = 75;
    const aspect = 2;
    const near = 0.1;
    const far = 500;
    const camera = new PerspectiveCamera(fov, aspect, near, far);

    camera.position.z = RENDER_SCALE * 4;
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
    const needResize = canvas.width !== this.renderSize.width || canvas.height !== this.renderSize.height;
    if (needResize) {
      renderer.setSize(this.renderSize.width, this.renderSize.height, false);
    }
    return needResize;
  }

  public async setStructureFromFile(file: File): Promise<LightStructure> {
    const structure = await parseLightStructure(file);
    console.log('got light structure in worker', structure);

    this.renderStructure(structure);

    return structure;
  }

  public setStructureFromMemory(structure: LightStructure) {
    this.renderStructure(structure);
  }

  private renderStructure(structure: LightStructure) {
    console.log('rendering structure', structure);
    this.scene.clear();

    for (const light of structure.lights) {
      const sphere = this.makeSphere(2, light.x * RENDER_SCALE, light.y * RENDER_SCALE, light.z * RENDER_SCALE);
      this.scene.add(sphere);
    }

    this.centerCamera(structure);

    this.addLight();
  }

  private centerCamera(structure: LightStructure) {
    const zs = structure.lights.map((l) => l.z);
    const min = Math.min(...zs);
    const max = Math.max(...zs);

    const diff = max - min;
    const middle = min + diff;

    this.camera.position.y = middle * RENDER_SCALE;
  }

  private makeSphere(radius: number, x: number, y: number, z: number) {
    const geometry = new SphereGeometry(radius, 10, 6);

    const material = new MeshPhongMaterial({
      color: 0x8866ff,
    });

    const mesh = new Mesh(geometry, material);
    mesh.position.x = x;
    mesh.position.y = y;
    mesh.position.z = z;
    return mesh;
  }
}

function initialize(ev: MessageEvent) {
  const canvas = ev.data.canvas;

  removeEventListener('message', initialize);

  const connection = new WebWorkerServerConnection();
  startWorkerProvider(new TreeLightRenderer(canvas), connection);
}

addEventListener('message', initialize);

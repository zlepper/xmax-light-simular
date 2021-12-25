import { startWorkerProvider } from '@zlepper/rpc';
import { WebWorkerServerConnection } from '@zlepper/web-worker-rpc';
import {
  BoxGeometry,
  BufferGeometry,
  Color,
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
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { ElementProxyReceiver, RenderSize } from '../helpers/orbit-control-wrapper';
import { ColorAnimation, parseColorAnimation, parseColorAnimationFromString } from '../models/color-animation';
import { LightStructure, parseLightStructure } from '../models/light-structure';

const RENDER_SCALE = 100;

const TIME_BETWEEN_FRAMES = 50;

export class TreeLightRenderer {
  private renderer: WebGLRenderer;
  private camera: PerspectiveCamera;
  private scene: Scene;
  private activeAnimation: ColorAnimation | null;
  private nextAnimationFrame = 0;
  private timeSinceLastFrameJump = 0;

  private lights: LightWrapper[] = [];
  private controls: OrbitControls;
  private elementProxy = new ElementProxyReceiver();

  private sceneLight: DirectionalLight;

  constructor(private canvas: OffscreenCanvas) {}

  initialize() {
    (self as any).document = {};
    this.renderer = this.createRenderer();
    this.camera = this.createCamera();
    this.controls = this.makeControls(this.elementProxy);

    this.scene = new Scene();
    this.sceneLight = this.addLight();

    this.initializeRendering();
  }

  private makeControls(inputElement: ElementProxyReceiver): OrbitControls {
    const controls = new OrbitControls(this.camera, inputElement as any);
    controls.target.set(0, 0, 0);
    controls.update();

    controls.addEventListener('change', () => {
      this.sceneLight.position.set(this.camera.position.x, this.camera.position.y, this.camera.position.z);
    });

    return controls;
  }

  private addLight() {
    const light = new DirectionalLight(0xffffff, 1);
    light.position.set(this.camera.position.x, this.camera.position.y, this.camera.position.z);
    this.scene.add(light);
    return light;
  }

  private initializeRendering() {
    this.renderer.render(this.scene, this.camera);

    const render = (time) => {
      time *= 0.001;

      this.timeSinceLastFrameJump += time;

      if (this.resizeRendererToDisplaySize(this.renderer)) {
        this.camera.aspect = this.elementProxy.clientWidth / this.elementProxy.clientHeight;
        this.camera.updateProjectionMatrix();
      }

      if (this.timeSinceLastFrameJump > TIME_BETWEEN_FRAMES) {
        this.goToNextAnimationFrame();
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
    this.elementProxy.updateSize(size);
  }

  private resizeRendererToDisplaySize(renderer: WebGLRenderer): boolean {
    const canvas = renderer.domElement;
    const { clientWidth: width, clientHeight: height } = this.elementProxy;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
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
    this.activeAnimation = null;
    this.scene.clear();
    this.lights = [];

    for (const light of structure.lights) {
      const sphere = this.makeSphere(2, light.x * RENDER_SCALE, light.y * RENDER_SCALE, light.z * RENDER_SCALE);
      this.scene.add(sphere.mesh);
      this.lights.push(sphere);
    }

    this.centerCamera(structure);

    this.scene.add(this.sceneLight);
  }

  private centerCamera(structure: LightStructure) {
    const zs = structure.lights.map((l) => l.z);
    const min = Math.min(...zs);
    const max = Math.max(...zs);

    const diff = max - min;
    const middle = min + diff;

    this.camera.position.y = middle * RENDER_SCALE;
    this.controls.target.y = this.camera.position.y;
  }

  private makeSphere(radius: number, x: number, y: number, z: number): LightWrapper {
    const geometry = new SphereGeometry(radius, 10, 6);

    const material = new MeshPhongMaterial({
      color: 0x000000,
    });

    const mesh = new Mesh(geometry, material);
    mesh.position.x = x;
    mesh.position.y = y;
    mesh.position.z = z;
    return new LightWrapper(mesh, material);
  }

  public async setColorAnimation(file: File): Promise<ColorAnimation> {
    const animation = await parseColorAnimation(file);
    console.log('parsed animation', animation);

    this.startRenderingAnimation(animation);

    return animation;
  }

  private startRenderingAnimation(animation: ColorAnimation) {
    this.activeAnimation = animation;
    this.nextAnimationFrame = 0;
  }

  private goToNextAnimationFrame() {
    if (!this.activeAnimation) {
      return;
    }

    const frame = this.activeAnimation.frames[this.nextAnimationFrame];
    if (!frame) {
      debugger;
    }

    this.nextAnimationFrame = (this.nextAnimationFrame + 1) % this.activeAnimation.frames.length;

    if (this.lights.length !== frame.lights.length) {
      console.error('number of lights and numbers of colors in frame does not match', {
        frame,
        numberOfLights: this.lights.length,
      });
    }

    for (let lightIndex = 0; lightIndex < frame.lights.length; lightIndex++) {
      const lightColor = frame.lights[lightIndex];
      const light = this.lights[lightIndex];

      light.material.color = new Color(lightColor.red / 255, lightColor.green / 255, lightColor.blue / 255);
    }
  }

  public sendProxyElementEvent(ev: any) {
    this.elementProxy.handleEvent(ev);
  }

  public async showZDebugPlane() {
    // @ts-ignore
    const content = await import('../debug-helpers/debug-z-plane.csv');

    const animation = parseColorAnimationFromString(content, 'debug-z-plane');
    this.startRenderingAnimation(animation);
  }
}

class LightWrapper {
  constructor(public readonly mesh: Mesh, public readonly material: MeshPhongMaterial) {}
}

function initialize(ev: MessageEvent) {
  const canvas = ev.data.canvas;

  removeEventListener('message', initialize);

  const connection = new WebWorkerServerConnection();
  startWorkerProvider(new TreeLightRenderer(canvas), connection);
}

addEventListener('message', initialize);

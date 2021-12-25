import { wrapBackgroundService, WrappedObject } from '@zlepper/rpc';
import { WebWorkerClientConnection } from '@zlepper/web-worker-rpc';
import {
  BoxGeometry,
  DirectionalLight,
  Mesh,
  MeshBasicMaterial,
  MeshPhongMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';
import { ElementProxy, eventHandlers } from './client/orbit-control-wrapper';
import { LocalStorageHelper } from './helpers/local-storage';
import { parseLightStructure } from './models/light-structure';
import { TreeLightRenderer } from './worker/worker';

class Application {
  private wrapper: WrappedObject<TreeLightRenderer>;
  private canvas: HTMLCanvasElement;
  private storage = new LocalStorageHelper();

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;

    const worker = new Worker(new URL('./worker/worker', import.meta.url), {
      type: 'module',
    });

    const offscreen = (this.canvas as any).transferControlToOffscreen();

    worker.postMessage({ canvas: offscreen }, [offscreen]);

    const connection = new WebWorkerClientConnection(worker);
    this.wrapper = wrapBackgroundService<TreeLightRenderer>(connection);
  }

  public async run() {
    const elementProxy = new ElementProxy(this.canvas, this.wrapper, eventHandlers);

    await this.wrapper.initialize();

    window.addEventListener('resize', () => {
      this.handleResize();
    });

    this.handleResize();

    this.setupControls();

    await this.tryLoadLastStructure();
  }

  private async tryLoadLastStructure() {
    const existing = this.storage.get('lastStructure');
    if (existing) {
      await this.wrapper.setStructureFromMemory(existing);
    }
  }

  private setupControls() {
    const shapeInput = document.getElementById('tree-share-input') as HTMLInputElement;

    shapeInput.addEventListener('change', async () => {
      console.log('new file selected');

      if (shapeInput.files?.length > 0) {
        const file = shapeInput.files.item(0);

        const structure = await this.wrapper.setStructureFromFile(file);

        this.storage.put('lastStructure', structure);
      }
    });

    const animationInput = document.getElementById('animation-input') as HTMLInputElement;

    animationInput.addEventListener('change', async () => {
      console.log('new animation file selected');

      if (animationInput.files?.length > 0) {
        const file = animationInput.files.item(0);

        await this.wrapper.setColorAnimation(file);
      }
    });
  }

  private handleResize() {
    const rect = this.canvas.getBoundingClientRect();

    this.wrapper.updateScreenSize({
      height: rect.height,
      width: rect.width,
      left: rect.left,
      top: rect.top,
    });
  }
}

const app = new Application();
app.run().catch((err) => console.error('something went horribly wrong', err));

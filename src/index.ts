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
  WebGLRenderer
} from 'three';
import { TreeLightRenderer } from './worker/worker';


class Application {

  private wrapper:  WrappedObject<TreeLightRenderer>;
  private canvas: HTMLCanvasElement;


  constructor() {

    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;

    const worker = new Worker(new URL('./worker/worker', import.meta.url), {
      type: 'module'
    })

    const offscreen = (this.canvas as any).transferControlToOffscreen();

    worker.postMessage({canvas: offscreen}, [offscreen])


    const connection = new WebWorkerClientConnection(worker);
    this.wrapper = wrapBackgroundService<TreeLightRenderer>(connection);
  }

  public async run() {
    await this.wrapper.initialize()

    window.addEventListener('resize', () => {
      this.handleResize();
    });

    this.handleResize();
  }

  private handleResize() {
    const {clientWidth, clientHeight}  =this.canvas;

    this.wrapper.updateScreenSize({
      height: clientHeight,
      width: clientWidth
    })
  }
}

const app = new Application();
app.run().catch(err => console.error('something went horribly wrong', err));

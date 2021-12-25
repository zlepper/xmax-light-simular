import { WrappedObject } from '@zlepper/rpc';
import { EventDispatcher } from 'three';
import { TreeLightRenderer } from '../worker/worker';

function noop() {}

export interface RenderSize {
  height: number;
  width: number;
  left: number;
  top: number;
}

export class ElementProxyReceiver extends EventDispatcher {
  private left: number = 0;
  private top: number = 0;
  private width: number = 300;
  private height: number = 150;

  public ownerDocument = this;
  public style = {};

  constructor() {
    super();
  }
  handleEvent(data) {
    data.preventDefault = noop;
    data.stopPropagation = noop;
    this.dispatchEvent(data);
  }
  updateSize(size: RenderSize) {
    this.left = size.left;
    this.top = size.top;
    this.width = size.width;
    this.height = size.height;
  }
  get clientWidth() {
    return this.width;
  }
  get clientHeight() {
    return this.height;
  }

  getBoundingClientRect() {
    return {
      left: this.left,
      top: this.top,
      width: this.width,
      height: this.height,
      right: this.left + this.width,
      bottom: this.top + this.height,
    };
  }

  focus() {}

  public setPointerCapture() {}
  public releasePointerCapture() {}
}

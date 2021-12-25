import { WrappedObject } from '@zlepper/rpc';
import { TreeLightRenderer } from '../worker/worker';

let nextProxyId = 1;

export class ElementProxy {
  private id: number;
  constructor(element: HTMLElement, worker: WrappedObject<TreeLightRenderer>, eventHandlers) {
    this.id = nextProxyId++;

    for (const [eventName, handler] of Object.entries(eventHandlers)) {
      element.addEventListener(eventName, function (event) {
        (handler as any)(event, (ev) => {
          worker.sendProxyElementEvent(ev);
        });
      });
    }
  }
}

const mouseEventHandler = makeSendPropertiesHandler([
  'ctrlKey',
  'metaKey',
  'shiftKey',
  'button',
  'pointerType',
  'clientX',
  'clientY',
  'pageX',
  'pageY',
]);
const wheelEventHandlerImpl = makeSendPropertiesHandler(['deltaX', 'deltaY']);
const keydownEventHandler = makeSendPropertiesHandler(['ctrlKey', 'metaKey', 'shiftKey', 'keyCode']);

function wheelEventHandler(event, sendFn) {
  event.preventDefault();
  wheelEventHandlerImpl(event, sendFn);
}

function preventDefaultHandler(event) {
  event.preventDefault();
}

function copyProperties(src, properties, dst) {
  for (const name of properties) {
    dst[name] = src[name];
  }
}

function makeSendPropertiesHandler(properties) {
  return function sendProperties(event, sendFn) {
    const data = { type: event.type };
    copyProperties(event, properties, data);
    sendFn(data);
  };
}

function touchEventHandler(event, sendFn) {
  const touches = [];
  const data = { type: event.type, touches };
  for (let i = 0; i < event.touches.length; ++i) {
    const touch = event.touches[i];
    touches.push({
      pageX: touch.pageX,
      pageY: touch.pageY,
    });
  }
  sendFn(data);
}

// The four arrow keys
const orbitKeys = {
  '37': true, // left
  '38': true, // up
  '39': true, // right
  '40': true, // down
};
function filteredKeydownEventHandler(event, sendFn) {
  const { keyCode } = event;
  if (orbitKeys[keyCode]) {
    event.preventDefault();
    keydownEventHandler(event, sendFn);
  }
}

export const eventHandlers = {
  contextmenu: preventDefaultHandler,
  mousedown: mouseEventHandler,
  mousemove: mouseEventHandler,
  mouseup: mouseEventHandler,
  pointerdown: mouseEventHandler,
  pointermove: mouseEventHandler,
  pointerup: mouseEventHandler,
  touchstart: touchEventHandler,
  touchmove: touchEventHandler,
  touchend: touchEventHandler,
  wheel: wheelEventHandler,
  keydown: filteredKeydownEventHandler,
};

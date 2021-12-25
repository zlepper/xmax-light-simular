console.log('from TS');


const worker = new Worker(new URL('./worker/worker', import.meta.url), {
    type: 'module',
})

worker.postMessage('hello there worker!')

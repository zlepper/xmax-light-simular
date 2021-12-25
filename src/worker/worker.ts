console.log('from worker');


addEventListener('message', ev => {
    console.log(ev)
})

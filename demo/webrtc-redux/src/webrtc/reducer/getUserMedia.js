export function getUserMedia() {
    navigator.mediaDevices.getUserMedia({
        audio: false,
        video: true
    }).then((stream)=>{
        document.querySelector('#v1').srcObject = stream
        store.dispatch({
            type: 'GetUserMediaSuccess',
            target: pc1,
            stream: stream,
            status: 'Success'
        })
    }).catch((err)=>{
        console.log(err)
        store.dispatch({
            type: 'GetUserMediaFailed',
            target: pc1,
            stream: null,
            status: 'Failed'
        })
    })
}
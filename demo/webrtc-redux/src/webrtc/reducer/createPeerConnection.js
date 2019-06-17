export function createPeerConnection(peer) {
    peer.ontrack = function (e) {
        console.log('获得应答方的视频流...', e.streams)
        document.querySelector('#v2').srcObject = e.streams[0]
    }
    peer.onicecandidate = function (event) {
        let target = null
        if(peer.name === 'pc1'){
            target = pc2
        }else{
            target = pc1
        }
        target.addIceCandidate(event.candidate).then(() => {
            console.log('candidate添加成功')
        }).catch((err)=>{
            console.log(err)
        })
    }

    peer.onsignalingstatechange = function (event) {

    }

    peer.onconnectionstatechange = function (event) {

    }

    peer.onicegatheringstatechange = function (event) {

    }

    peer.oniceconnectionstatechange = function (event) {

    }

    peer.onnegotiationneeded = function (event) {
        console.log('需要协商...')
    }
}
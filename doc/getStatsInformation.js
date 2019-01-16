function getStatsInformation(PeerConnection, track = null) {
    let target = []
    let stats = {
        audio: {
            jitter: -1,
            packetLost: -1,
            packetReceived: -1
        },
        video: {
            packetLost: -1,
            packetReceived: -1
        }
    }
    if (PeerConnection instanceof RTCPeerConnection) {
        let count = []
        if (track && track instanceof MediaStreamTrack) {
            PeerConnection.getReceivers().forEach(item => {
                if (item.track === track) {
                    count.push(item)
                }
            })
            PeerConnection.getSenders().forEach(item => {
                if (item.track === track) {
                    count.push(item)
                }
            })
            if (count.length === 1) {
                target.push(count[0].getStats())
            } else {
                return new DOMException('Error: There are more than one MediaStreamTrack').message
            }
        } else {
            PeerConnection.getReceivers().forEach(item => {
                if(item.track!==null){
                    target.push(item.getStats())
                }
            })
            PeerConnection.getSenders().forEach(item => {
                if(item.track!==null){
                    target.push(item.getStats())
                }
            })
        }
    } else {
        return new DOMException('Error: The first parameter isn\'t an instance of Constructor RTCPeerConnection').message
    }
    return Promise.all(target)
        .then(res => {
            res.forEach(item => {
                let temp = [...item.values()]
                temp.forEach(info => {
                    if (info.type.includes('inbound')) {
                        if (info.kind === 'video') {
                            stats.video.packetReceived = info.packetsReceived
                            stats.video.packetLost = info.packetsLost
                        } else {
                            stats.audio.packetReceived = info.packetsReceived
                            stats.audio.packetLost = info.packetsLost
                            stats.audio.jitter = info.jitter
                        }
                    }
                })
            })
            console.log(stats)
        })
        .catch(rej => console.log(rej.message))
}
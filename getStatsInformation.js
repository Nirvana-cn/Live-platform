function getStatsInformation(peerConnection, track = null) {
    let target
    return new Promise(function (resolve, reject) {
        if (peerConnection instanceof RTCPeerConnection && (!track || (track && track instanceof MediaStreamTrack))) {
            peerConnection.getStats(track)
                .then(stats => {
                    stats.forEach(function (item) {
                        if (item.type === 'inbound-rtp' && item.kind === 'audio') {
                            target = item
                        }
                    })
                    resolve(target)
                })
        }
    })
}
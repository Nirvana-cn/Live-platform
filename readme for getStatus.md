### RTCPeerConnection.prototype.getStats()分析

[adapt.js](https://webrtc.github.io/adapter/adapter-latest.js)中的getStatus源码

```
RTCPeerConnection.prototype.getStats = function(selector) {
            if (selector && selector instanceof window.MediaStreamTrack) {
                var senderOrReceiver = null;
                this.transceivers.forEach(function(transceiver) {
                    if (transceiver.rtpSender &&
                        transceiver.rtpSender.track === selector) {
                        senderOrReceiver = transceiver.rtpSender;
                    } else if (transceiver.rtpReceiver &&
                        transceiver.rtpReceiver.track === selector) {
                        senderOrReceiver = transceiver.rtpReceiver;
                    }
                });
                if (!senderOrReceiver) {
                    throw makeError('InvalidAccessError', 'Invalid selector.');
                }
                return senderOrReceiver.getStats();
            }

            var promises = [];
            this.transceivers.forEach(function(transceiver) {
                ['rtpSender', 'rtpReceiver', 'iceGatherer', 'iceTransport',
                    'dtlsTransport'].forEach(function(method) {
                    if (transceiver[method]) {
                        promises.push(transceiver[method].getStats());//transceiver[method].getStats()是一个异步操作
                    }
                });
            });
            return Promise.all(promises).then(function(allStats) {
                var results = new Map();
                allStats.forEach(function(stats) {
                    stats.forEach(function(stat) {
                        results.set(stat.id, stat);
                    });
                });
                return results;//最终返回的是一个Map结构
            });
        };
```

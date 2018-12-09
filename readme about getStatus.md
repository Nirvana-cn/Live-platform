### RTCPeerConnection.prototype.getStats()分析
1. getStatus()结构，主要包含以下[四个部分](https://www.callstats.io/blog/2015/07/06/basics-webrtc-getstats-api)：

- 发送者媒体捕获统计：对应于媒体生成，通常是帧速率，帧大小，媒体源的时钟速率，编解码器(codec)的名称等。

- 发送方RTP统计信息：对应于媒体发送方，通常是发送的数据包，发送的字节数，往返时间等。

- 接收者RTP统计：对应于媒体接收者，通常是接收的数据包，接收的字节数，丢弃的数据包，丢失的数据包，抖动等

- 接收器媒体渲染统计：对应于媒体渲染，通常是丢帧，丢帧，渲染帧，播放延迟等。


2. getStatus()源码解析

[adapt.js](https://webrtc.github.io/adapter/adapter-latest.js)中的getStatus源码如下所示：

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

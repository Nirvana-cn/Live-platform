### RTCPeerConnection.prototype.getStats()分析
1. getStatus()结构，主要包含以下[四个部分](https://www.callstats.io/blog/2015/07/06/basics-webrtc-getstats-api)：

- 发送者媒体捕获统计：对应于媒体生成，通常是帧速率，帧大小，媒体源的时钟速率，编解码器(codec)的名称等。

- 发送方RTP统计信息：对应于媒体发送方，通常是发送的数据包，发送的字节数，往返时间等。

- 接收者RTP统计：对应于媒体接收者，通常是接收的数据包，接收的字节数，丢弃的数据包，丢失的数据包，抖动等。

- 接收器媒体渲染统计：对应于媒体渲染，通常是帧丢失，帧丢弃，渲染帧，播放延迟等。

同时还包括一些杂项信息，比如：

- DataChannel metrics：对应于在特定数据通道上发送和接收的消息和字节。

- Interface metrics：对应于与活动传输候选相关的度量，比如在该接口上发送或接收的字节，数据包和RTT。

- 证书统计：显示证书相关信息，例如指纹和当前加密算法。

2. getStats()源码解析

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


3. getStats()字段分析

如前所述，getStats()返回的是一个Map结构，Map结构的每一个键值对的值是一个对象，键值为该对象的id属性。

首先在返回的所有键值对中，最重要的是键值为"RTCTransport_video_1"或"RTCTransport_audio_1"的对象。该对象包含当前PeerConnection建立所需要的信息。该对象包含的字段信息如下：

字段 | 值类型 | 说明
----|------|----
bytesReceived | 数值  | 收到的比特数
bytesSent | 数值  | 发送的比特数
dtlsState | 字符串  | dtls的连接状态，常见值为"connected"
id | 字符串  | 与键值一致
localCertificateId | 字符串 | 本地证书
remoteCertificateId | 字符串  | 远程证书
selectedCandidatePairId | 字符串  | 选取的ICE连接方式
timestamp | 数值  | 时间戳
type | 字符串  | 类型说明，常见值为"transport"

为什么从该对象出发，从type类型我们不难发现这是所建立的PeerConnection的信息概括。从该对象我们可以获取getStats()返回的其它对象。

比如，通过localCertificateId或remoteCertificateId，我们可以获取证书对象信息。

```
PeerConnection.getStats().then(stats => {
    let target=stats.get("RTCTransport_audio_1")||stats.get("RTCTransport_video_1");
    console.log(stats.get(target.localCertificateId))
    })
```

证书对象包含的字段信息如下(本地证书和远程证书包含的字段信息一致)：

字段 | 值类型 | 说明
----|------|----
base64Certificate | 字符串  | 64位的证书编码
fingerprint | 字符串  | 指纹
fingerprintAlgorithm | 字符串  | 指纹的加密算法，常见值为"sha-256"
id | 字符串  | 与键值一致
timestamp | 数值  | 时间戳
type | 字符串  | 类型说明，常见值为"certificate"

然后，"RTCTransport_video_1"或"RTCTransport_audio_1"对象中另一个非常重要的字段就是selectedCandidatePairId，顾名思义，selectedCandidatePairId代表着选取的ICE连接方式。

selectedCandidatePairId常见值形式如下："RTCIceCandidatePair_[8位编码]\_[8位编码]"，例如"RTCIceCandidatePair\_+SgV3pPQ_mWR7jqSK"，每一个拼接的字符串代表着一种候选的ICE连接方式，通常webrtc会分别列出5种本地和远程可以进行的ICE候选方式，使用"RTCIceCandidate_[8位编码]"可以获取该种ICE连接方式的信息对象。

"RTCIceCandidate_[8位编码]"字段的对象属性如下：

字段 | 值类型 | 说明
----|------|----
candidateType | 字符串  | 候选方式类型，常见值为"host"
deleted | 布尔  | 候选方式是否删除
ip | 字符串  | 形如"2001:db8:1:3:79ac:28a4:e937:ce6a"，有的加密有的不加密？？
id | 字符串  | 与键值一致
isRemote | 布尔 | 是否是远程，本地为false，远程为true
networkType | 字符串  | 网络类型，比如"ethernet"，其它类型？？
port | 数值  | 端口号
priority | 数值  | 优先级
protocol | 字符串  | 协议类型，常见值为"udp"
timestamp | 数值  | 时间戳
transportId | 字符串  | 与一开始所述的"RTCTransport_video_1"或"RTCTransport_audio_1"对象对应
type | 字符串  | 类型说明，常见值为"local-candidate"或"remote-candidate"

确定了可进行ICE的方式之后，就需要确定哪一种连接方式是最优的，所以就会产生"RTCIceCandidatePair_[8位编码]_[8位编码]"对象，来测试每一对连接的性能。

"RTCIceCandidatePair_[8位编码]_[8位编码]"字段的对象属性如下：

字段 | 值类型 | 说明
----|------|----
bytesReceived | 数值  | 收到的比特数
bytesSent | 数值  | 发送的比特数
consentRequestsSent | 数值  | ？？？
currentRoundTripTime | 数值  | ？？？
id | 字符串 | 与键值一致
localCandidateId | 字符串  | 此种ICE连接方式下本地的ICE候选方式，即第一段[8位编码]
nominated | 布尔  | 提名，此种ICE配对是否合适，合适则获得提名
priority | 数值  | 优先级
remoteCandidateId | 字符串  | 此种ICE连接方式下远程的ICE候选方式，即第二段[8位编码]
requestsReceived | 数值  | 请求接收
requestsSent | 数值  | 请求发送
responsesReceived | 数值  | 响应接收
responsesSent | 数值  | 响应发送
state | 字符串  | 此种ICE连接方式的状态，常见值有"succeeded/waiting"
timestamp | 数值  | 时间戳
totalRoundTripTime | 数值  | 总计路由往返时间
transportId | 字符串  | 与一开始所述的"RTCTransport_video_1"或"RTCTransport_audio_1"对象对应
type | 字符串  | 类型说明，常见值为"candidate-pair"
writable | 布尔  | 可配置标识，该对象可改写则为true，否则为false

如果此种ICE配对方式获得提名，即nominated属性值为true，那么该对象下还会增加一个属性描述

字段 | 值类型 | 说明
----|------|----
availableOutgoingBitrate | 数值 | ？？？

此处还有一个疑问就是如何进行配对选择，webrtc这里并没有提供全部25种配对方式，仅仅提供了6种配对方式？还是说这6种配对方式是25种配对方式中较优的？？？

证书和ICE状态确定之后，我们还需要知道信道和视频、音频流的一些状态信息。


流标识符对象的键名一般为"RTCMediaStream_[36位编码]"的形式，该对象具有的属性如下：

字段 | 值类型 | 说明
----|------|----
id | 字符串 | 与键名一致
streamIdentifier | 字符串  | 唯一36位编码stream标识
trackIds | 数组  | 传输的视频、音频流，形如["RTCMediaStreamTrack_sender_[编号]"，"RTCMediaStreamTrack_receiver_[编号]"]
timestamp | 数值  | 时间戳
type | 字符串  | 类型说明，常见值为"stream"


流标识符对象并不复杂，重要的是其trackIds中track信息，数组中每一个元素都是一个track，在getStats中都有一个对象存储详细的track信息。

"RTCMediaStreamTrack_sender_[编号]"或"RTCMediaStreamTrack_receiver_[编号]"为发送或接收的视频、音频流信息，若为视频流，则该对象属性如下：

字段 | 值类型 | 说明
----|------|----
detached | 布尔 | ？？？
ended | 布尔 | ？？？
frameHeight | 数值 | 帧高度
frameWidth | 数值 | 帧宽度
framesSent | 数值 | 发送帧总数
hugeFramesSent | 数值 | ？？？
id | 字符串 | 与键名一致
kind | 字符串 | track类型，视频流值为"video"，音频流值为"audio"
remoteSource | 布尔  | 是否为远程资源，本地为false，远程为true
trackIdentifier | 字符串  | 形如"5a1eada8-f9eb-4472-ab97-2a232f311513"
timestamp | 数值  | 时间戳
type | 字符串  | 类型说明，常见值为"track"

若为音频流，则该对象属性如下：

字段 | 值类型 | 说明
----|------|----
audioLevel | 布尔 | ？？？
detached | 布尔 | ？？？
ended | 布尔 | ？？？
id | 字符串 | 与键名一致
kind | 字符串 | track类型，视频流值为"video"，音频流值为"audio"
remoteSource | 布尔  | 是否为远程资源，本地为false，远程为true
totalAudioEnergy | 数值  | ？？？
totalSamplesDuration | 数值  | ？？？
trackIdentifier | 字符串  | 形如"5a1eada8-f9eb-4472-ab97-2a232f311513"
timestamp | 数值  | 时间戳
type | 字符串  | 类型说明，常见值为"track"


更详细的stream传输信息需要在"RTCOutboundRTPAudioStream_[10位编码]"、"RTCOutboundRTPVideoStream_[10位编码]"、"RTCInboundRTPAudioStream_[10位编码]"和"RTCInboundRTPVideoStream_[10位编码]"对象中获取。

sender为"RTCOutboundRTPAudioStream_[10位编码]"、"RTCOutboundRTPVideoStream_[10位编码]"，receiver为"RTCInboundRTPAudioStream_[10位编码]"、"RTCInboundRTPVideoStream_[10位编码]"。

"RTCOutboundRTPAudioStream_[10位编码]"和"RTCInboundRTPAudioStream_[10位编码]"具有的相同属性如下：

字段 | 值类型 | 说明
----|------|----
codecId | 字符串 | 编码器名称
id | 字符串 | 与键名一致
kind | 字符串 | 音频流值为"audio"
mediaType | 字符串 |音频流值为"audio"
isRemote | 布尔 |是否为远程
ssrc | 数值  | ？？？
trackId | 布尔  | 与"RTCMediaStream_[36位编码]"对象中trackIds中元素一致
transportId | 布尔  | 与一开始所述的"RTCTransport_video_1"或"RTCTransport_audio_1"对象对应
timestamp | 数值  | 时间戳
type | 字符串  | 类型说明，常见值为"outbound-rtp"或"inbound-rtp"

"RTCOutboundRTPAudioStream_[10位编码]"独有的属性如下：

字段 | 值类型 | 说明
----|------|----
bytesSent | 数值 | 发送的比特数
packetsSent | 数值  | 包发送数量


"RTCInboundRTPAudioStream_[10位编码]"独有的属性如下：

字段 | 值类型 | 说明
----|------|----
bytesReceived | 数值 | 发送的比特数
fractionLost | 数值 | 片段丢失数
jitter | 数值 | 抖动情况
packetsLost | 数值 | 包丢失数量
packetsReceived | 数值 | 包接收数量

"RTCOutboundRTPVideoStream_[10位编码]"和"RTCInboundRTPVideoStream_[10位编码]"具有的相同属性如下：

字段 | 值类型 | 说明
----|------|----
codecId | 字符串 | 编码器名称
id | 字符串 | 与键名一致
firCount | 数值 | ？？？
nackCount | 数值 | ？？？
pliCount | 数值 | ？？？
kind | 字符串 | 视频流值为"video"
mediaType | 字符串 |视频流值为"video"
isRemote | 布尔 |是否为远程
qpSum | 数值  | ？？？
ssrc | 数值  | ？？？
trackId | 布尔  | 与"RTCMediaStream_[36位编码]"对象中trackIds中元素一致
transportId | 布尔  | 与一开始所述的"RTCTransport_video_1"或"RTCTransport_audio_1"对象对应
timestamp | 数值  | 时间戳
type | 字符串  | 类型说明，常见值为"outbound-rtp"或"inbound-rtp"

"RTCOutboundRTPAudioStream_[10位编码]"独有的属性如下：

字段 | 值类型 | 说明
----|------|----
bytesSent | 数值 | 发送的比特数
framesEncoded | 数值 | 帧编码数
packetsSent | 数值 | 发送的包数


"RTCInboundRTPAudioStream_[10位编码]"独有的属性如下：

字段 | 值类型 | 说明
----|------|----
bytesReceived | 数值 | 发送的比特数
fractionLost | 数值 | 片段丢失数
framesDecoded | 数值 | 帧解码数
packetsLost | 数值 | 包丢失数量
packetsReceived | 数值 | 包接收数量

剩下的主要为"RTCCodec_video_Outbound_[编号]"、RTCCodec_video_Inbound_[编号]"、"RTCCodec_audio_Outbound_[编号]"和"RTCCodec_audio_Inbound_[编号]"四个视频、音频编码器对象，具有的属性如下：

字段 | 值类型 | 说明
----|------|----
clockRate | 数值 | 时钟率
mimeType | 数值 | 处理的媒体类型
payloadType | 数值 | ？？？
id | 字符串 | 与键名一致
timestamp | 数值  | 时间戳
type | 字符串  | 类型说明，常见值为"codec"

猜想：对于不同的媒体流，需要根据不同的时钟率(clockRate)和媒体类型(mimeType)选择合适的解码器(codec)。

最后还有一个"RTCPeerConnection"对象，其具有的属性如下：

字段 | 值类型 | 说明
----|------|----
dataChannelsClosed | 数值 | 数据通道关闭？？？
dataChannelsOpened | 数值 | ？？？
id | 字符串 | 与键名一致
timestamp | 数值  | 时间戳
type | 字符串  | 类型说明，常见值为"peer-connection"



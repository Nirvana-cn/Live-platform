## RTCPeerConnection.prototype.getStats()分析



本篇文档主要分析RTCPeerConnection.prototype.getStats()方法，从而获取webrtc连接的状态统计信息，主要分为以下7个部分

[TOC]


1. [对getStats()的返回信息进行综述;](#user-content-锚点)
2. [getStats()方法源码解析；](#user-content-getStats()源码解析)
3. [W3C标准下getStats()字段；](#3)
4. [Chrome；](#4)
5. [FireFox；](#5)
6. [Microsoft Edge；](#6)
7. [实际应用封装；](#7)

---

### 1. getStats()结构，主要包含以下[四个部分](https://www.callstats.io/blog/2015/07/06/basics-webrtc-getstats-api)： {#1}

- 发送者媒体捕获统计：对应于媒体生成，通常是帧速率，帧大小，媒体源的时钟速率，编解码器(codec)的名称等。

- 发送方RTP统计信息：对应于媒体发送方，通常是发送的数据包，发送的字节数，往返时间等。

- 接收者RTP统计：对应于媒体接收者，通常是接收的数据包，接收的字节数，丢弃的数据包，丢失的数据包，抖动等。

- 接收器媒体渲染统计：对应于媒体渲染，通常是帧丢失，帧丢弃，渲染帧，播放延迟等。

同时还包括一些杂项信息，比如：

- DataChannel metrics：对应于在特定数据通道上发送和接收的消息和字节。

- Interface metrics：对应于与活动传输候选相关的度量，比如在该接口上发送或接收的字节，数据包和RTT。

- 证书统计：显示证书相关信息，例如指纹和当前加密算法。

### 2. getStats()源码解析

[adapt.js](https://webrtc.github.io/adapter/adapter-latest.js)中的getStatus源码如下所示：

```javascript
        RTCPeerConnection.prototype.getStats = function(selector) {
            if (selector && selector instanceof window.MediaStreamTrack) {
            // window.MediaStreamTrack是一个构造函数，应该是所有的track都是由MediaStreamTrack创建的
                var senderOrReceiver = null;
                this.transceivers.forEach(function(transceiver) {
                    // 去transceivers中寻找符合selector的track
                    if (transceiver.rtpSender && transceiver.rtpSender.track === selector) {
                        senderOrReceiver = transceiver.rtpSender;
                    } else if (transceiver.rtpReceiver && transceiver.rtpReceiver.track === selector) {
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
                ['rtpSender', 'rtpReceiver', 'iceGatherer', 'iceTransport', 'dtlsTransport'].forEach(function(method) {
                // 在实例的transceivers属性上获取状态，从上面的数组不难发现获取的状态应该主要包括以下五个部分：
                // rtp发送（outgoing traffic）、rtp接收（incoming traffic）、ice收集、ice传输以及dtls传输
                    if (transceiver[method]) {
                        promises.push(transceiver[method].getStats());//transceiver[method].getStats()是一个异步操作
                    }
                });
            });
            return Promise.all(promises).then(function(allStats) {
                var results = new Map();
                allStats.forEach(function(stats) {
                    stats.forEach(function(stat) {
                        results.set(stat.id, stat);// Map结构的每一个键值对的值是一个对象，键值为该对象的id属性
                    });
                });
                return results;// 最终返回的是一个Map结构
            });
        };
```


### 3. W3C标准getStats()字段分析{#3}

** 关于所有字段的意义可以参考[W3C标准第7部分](https://www.w3.org/TR/webrtc-stats/)。W3C标准一共有26个表示状态信息的对象

（1）全局状态概览对象（1个）：

"RTCTransportStats"对象表示与RTCDtlsTransport及其基础RTCIceTransport对应的统计信息。
当使用RTCP复用时，一个传输用于RTP和RTCP。 否则，RTP和RTCP将在单独的传输上发送，
并且rtcpTransportStatsId可用于配对生成的RTCTransportStats对象。此外，使用捆绑时，单个传输将用于捆绑组中的所有MediaStreamTracks。
如果未使用捆绑，则不同的MediaStreamTrack将使用不同的传输。

"RTCTransportStats"对象具有的属性如下：

字段 | 值类型 | 说明
----|------|----
packetsSent | unsigned long | 表示通过此传输发送的数据包总数
packetsReceived  | unsigned long | 表示通过此传输接收的数据包总数
bytesReceived | unsigned long long  | 表示在此PeerConnection上接收的有效负载字节总数，不包括标头或填充
bytesSent | unsigned long long  | 表示在此PeerConnection上发送的有效负载字节总数，不包括标头或填充
rtcpTransportStatsId  | DOMString  | 如果RTP和RTCP未进行多路复用，则这是为RTCP组件提供统计信息的传输的ID，并且此记录仅具有RTP组件统计信息
iceRole  | RTCIceRole  | 设置为基础RTCDtlsTransport的“传输”的“角色”属性的当前值
dtlsState | RTCDtlsTransportState  | 设置为基础RTCDtlsTransport的“state”属性的当前值，常见值为"connected"
localCertificateId | DOMString | 本地证书
remoteCertificateId | DOMString  | 远程证书
selectedCandidatePairId | DOMString  | 它是与检查的对象关联的唯一标识符，用于生成与此传输关联的RTCIceCandidatePairStats

（2）与dtls有关的对象（1个）

通过"RTCTransportStats"对象的localCertificateId或remoteCertificateId属性，我们可以获取证书对象信息，即源码中对应dtls传输的状态信息。
证书"RTCCertificateStats"对象具有的属性如下：

字段 | 值类型 | 说明
----|------|----
base64Certificate | DOMString  | 64位的证书编码
fingerprint | DOMString  | 指纹
fingerprintAlgorithm | DOMString  | 指纹的加密算法，比如，"sha-256"
issuerCertificateId  | DOMString  | issuerCertificateId引用包含证书链中下一个证书的stats对象。 如果当前证书位于链的末尾（即自签名证书），则不会设置此证书

（3）与ICE有关的对象（2个）

与ICE收集和传输相关的对象有"RTCIceCandidatePairStats"和"RTCIceCandidateStats"。

"RTCIceCandidateStats"对象属性如下：

字段 | 值类型 | 说明
----|------|----
candidateType | RTCIceCandidateType  | 候选方式类型，常见值为"host"
deleted | Boolean  | 对于本地候选者，true表示候选人已被删除/释放，如[RFC5245]所述。 对于主机候选者，这意味着已释放与候选者相关联的任何网络资源（通常是套接字）。 对于TURN候选者，这意味着TURN分配不再有效
ip | DOMString  | 它是候选者的IP地址，允许使用IPv4地址和IPv6地址，但不允许使用完全限定的域名（fully qualified domain names，FQDN）
isRemote | Boolean | 是否是远程，本地为false，远程为true（已废弃）
networkType | RTCNetworkType  | 网络类型，比如"ethernet"，"wifi","cellular"等
port | long | 端口号
priority | long  | 优先级
protocol | DOMString  | 协议类型，常见值为"udp"
transportId | DOMString  | 与一开始所述的"RTCTransport_video_1"或"RTCTransport_audio_1"对象对应

确定了可进行ICE的方式之后，就需要确定哪一种连接方式是最优的，所以就会产生"RTCIceCandidatePairStats"对象，来测试每一对连接的性能。

"RTCIceCandidatePairStats"对象属性如下：

字段 | 值类型 | 说明
----|------|----
packetsSent  | unsigned long  | 表示在此候选对上发送的数据包总数。
packetsReceived  | unsigned long  | 表示此候选对上接收的数据包总数。
bytesReceived | unsigned long long  | 表示在该候选对上接收的有效负载字节的总数，不包括头或填充。
bytesSent | unsigned long long  | 表示在此候选对上发送的有效负载字节总数，不包括标头或填充。
lastPacketSentTimestamp  | DOMHighResTimeStamp  | 表示在此特定候选对上发送最后一个数据包的时间戳，不包括STUN数据包。
lastPacketReceivedTimestamp  | DOMHighResTimeStamp  | 表示在此特定候选对上接收最后一个数据包的时间戳，不包括STUN数据包。
firstRequestTimestamp  | DOMHighResTimeStamp  | 表示在此特定候选对上发送第一个STUN请求的时间戳。
lastRequestTimestamp  | DOMHighResTimeStamp  | 表示在此特定候选对上发送最后一个STUN请求的时间戳。
lastResponseTimestamp   | DOMHighResTimeStamp  | 表示在此特定候选对上收到最后一个STUN响应的时间戳。
totalRoundTripTime | double  | 表示自会话开始以来的所有往返时间测量值的总和，基于STUN连接检查[STUN-PATH-CHAR]响应（respondReceived），包括回复为验证同意而发送的请求的响应[RFC7675]。 平均往返时间可以通过将其除以respondReceived来计算totalRoundTripTime。
currentRoundTripTime | double  | 表示以秒为单位测量的最新往返时间，从STUN连接检查[STUN-PATH-CHAR]计算，包括为同意验证发送的那些[RFC7675]。
availableOutgoingBitrate | double | 通过使用该候选对组合所有输出RTP流的可用比特率，通过基础拥塞控制来计算它。 比特率测量不计算IP或TCP或UDP等其他传输层的大小。 它类似于[RFC3890]中定义的TIAS，即，它以每秒位数为单位进行测量，并且在1秒窗口内计算比特率。
availableIncomingBitrate | double | 通过使用该候选对组合所有传入RTP流的可用比特率，通过基础拥塞控制来计算它。 比特率测量不计算IP或TCP或UDP等其他传输层的大小。 它类似于[RFC3890]中定义的TIAS，即，它以每秒位数为单位进行测量，并且在1秒窗口内计算比特率。
circuitBreakerTriggerCount  | unsigned long  | 表示针对此特定5元组触发断路器的次数。 触发断路器时停止传输在[RFC8083]的第4.5节中定义。 对于未实现断路器算法的用户代理，该字段必须返回undefined。
requestsReceived | unsigned long long  | 表示收到的连接检查请求的总数（包括重新传输）。 接收方无法判断是否发送了请求以检查连接或检查同意，因此所有连接检查请求都在此计算。
requestsSent | unsigned long long  | 表示发送的连接检查请求的总数（不包括重新传输）。
responsesReceived | unsigned long long  | 表示收到的连接检查响应的总数。
responsesSent | unsigned long long  | 表示发送的连接检查响应的总数。由于我们无法区分连接检查请求和同意请求，因此会计算所有响应。
retransmissionsSent | unsigned long long  | 表示发送的连接检查响应的总数。由于我们无法区分连接检查请求和同意请求，因此会计算所有响应。
retransmissionsReceived   | unsigned long long  | 表示收到的连接检查请求重新传输的总数。重传被定义为具有TRANSACTION_TRANSMIT_COUNTER属性的连接性检查请求，其中“req”字段大于1，如[RFC7982]中所定义。
consentExpiredTimestamp  | DOMHighResTimeStamp  | 表示最新的有效STUN绑定响应到期的时间戳，如[RFC7675]第5.1节中所定义。如果尚未生成有效的STUN绑定响应（respondReceived为零）或最新的绑定响应未到期，则此值必须未定义。
consentRequestsSent | unsigned long long  | 表示已发送的同意请求的总数。
localCandidateId | DOMString  | 它是与检查的对象关联的唯一标识符，用于为与此候选对关联的本地候选项生成RTCIceCandidateStats。
remoteCandidateId | DOMString  | 它是与检查的对象关联的唯一标识符，以生成与此候选对关联的远程候选项的RTCIceCandidateStats。
nominated | Boolean  | 提名，此种ICE配对是否合适，合适则获得提名
state | RTCStatsIceCandidatePairState  | 此种ICE连接方式的状态，常见值为"succeeded"，"waiting"，"fail"，"in-progress"和"frozen"
transportId | DOMString  | 与一开始所述的"RTCTransport_video_1"或"RTCTransport_audio_1"对象对应

（4）与媒体流相关的对象（10个）

证书和ICE状态确定之后，我们还需要知道信道和视频、音频流的一些状态信息，即源码中对应rtp接收、发送的状态信息。
主要包括"RTCMediaStreamStats"、"RTCMediaHandlerStats"、等对象，

"RTCMediaStreamStats"对象具有的属性如下：

字段 | 值类型 | 说明
----|------|----
streamIdentifier | DOMString  | stream.id属性
trackIds | sequence | 这是stats对象的id，而不是track.id。

"RTCMediaHandlerStats"对象具有的属性如下：

字段 | 值类型 | 说明
----|------|----
label  | DOMString | RTCDataChannel对象的“label”值。
protocol  | DOMString | RTCDataChannel对象的“协议”值。
dataChannelIdentifier | long | RTCDataChannel对象的“id”属性。
transportId   | DOMString | 用于传输此数据通道的传输的统计信息对象引用。
state  | RTCDataChannelState | RTCDataChannel对象的“readyState”值。
messagesSent  | unsigned long  | 表示发送的API“消息”事件的总数。
bytesSent  | unsigned long long  | 表示在此RTCDatachannel上发送的有效负载字节总数，不包括标头或填充。
messagesReceived  | unsigned long  | 表示收到的API“消息”事件的总数。
bytesReceived  | unsigned long long  | 表示在此RTCDatachannel上收到的有效负载字节总数，不包括标头或填充。

"RTCRtpStreamStats"对象具有的属性如下：

字段 | 值类型 | 说明
----|------|----
ssrc   | DOMString | 32位无符号整数值，用于标识此stats对象所关注的RTP数据包流的来源。
kind   | DOMString | “音频”或“视频”。 这必须与RTCCodecStats的相应编解码器成员中的信息的媒体类型部分匹配，并且必须与相关MediaStreamTrack的“kind”属性匹配。
transportId  | DOMString| 它是与检查的对象关联的唯一标识符，用于生成与此RTP流关联的RTCTransportStats。
codecId    | unsigned long | 它是与检查的对象关联的唯一标识符，用于生成与此RTP流关联的RTCCodecStats。
firCount   | unsigned long | 计算发送方接收的全内部请求（Full Intra Request, FIR）数据包的总数。该指标仅对视频有效，由接收方发送。
pliCount   | unsigned long  | 计算发送方接收的图像丢失指示（Picture Loss Indication, PLI）数据包的总数。该指标仅对视频有效，由接收方发送。按[RFC4585]第6.3.1节中的定义计算。
nackCount   | unsigned long | 计算发送方接收的否定确认（Negative ACKnowledgement, NACK）数据包的总数，并由接收方发送。按[RFC4585] 6.2.1节中的定义计算。
sliCount   | unsigned long  | 计算发送方接收的Slice Loss Indication（SLI）数据包的总数。该指标仅对视频有效，由接收方发送。按[RFC4585]第6.3.2节中的定义计算。
qpSum   | unsigned long long  | 通过的帧的QP值之和。 帧数是以帧为单位为入站流统计信息进行解码，而帧为对于出站流统计信息进行编码。QP值的定义取决于编解码器; 对于VP8，QP值是帧头中携带的值，作为语法元素“y_ac_qi”，并在[RFC6386]第19.2节中定义。它的范围是0..127

"RTCReceivedRtpStreamStats"对象具有的属性如下：

字段 | 值类型 | 说明
----|------|----
packetsReceived   | unsigned long | 此SSRC收到的RTP数据包总数。在接收端点，按[RFC3550]第6.4.1节中的定义计算。在发送端点，可以通过RTCP发送器报告中报告的预期最高序列号中减去丢失的数据包来计算packetsReceived。
packetsLost   | long | 此SSRC丢失的RTP数据包总数。按照[RFC3550]第6.4.1节中的定义计算。请注意，由于估计的方式，如果收到的数据包多于发送的数据包，则可能为负数。
jitter  | long | 此SSRC以秒为单位测量数据包抖动。
packetsDiscarded    | unsigned long | 由于迟到或早到，抖动缓冲器丢弃的RTP分组的累积数量，即这些分组未被播放
packetsRepaired   | unsigned long | 应用错误恢复机制[XRBLOCK-STATS]后修复的丢失RTP数据包的累计数量。它是针对主要源RTP数据包进行测量的，仅针对没有进一步修复机会的RTP数据包进行计数。
burstPacketsLost   | unsigned long  | 丢失突发期间丢失的RTP数据包的累计数量。
burstPacketsDiscarded   | unsigned long | 丢弃突发期间丢弃的RTP数据包的累计数量。
burstLossCount   | unsigned long  | 丢失的RTP数据包的累积突发数。
burstDiscardCount    | double  | 丢弃的RTP数据包的累积突发数。
burstLossRate     | double | 在突发期间丢失的RTP分组的比例与突发中预期的RTP分组的总数。
burstDiscardRate    | double  | 表在突发期间丢弃的RTP分组的比例与突发中预期的RTP分组的总数。
gapLossRate    | double | 在间隙期间丢失的RTP数据包的比例。
gapDiscardRate    | double| 在间隙期间丢弃的RTP分组的比例。

"RTCSentRtpStreamStats"对象具有的属性如下：

字段 | 值类型 | 说明
----|------|----
packetsSent   | unsigned long | 为此SSRC发送的RTP数据包总数。
packetsDiscardedOnSend   | unsigned long | 由于套接字错误而丢弃的此SSRC的RTP数据包总数，即在将数据包传递到套接字时发生套接字错误。这可能由于各种原因而发生，包括完全缓冲或无可用内存。
fecPacketsSent  | unsigned long | 为此SSRC发送的RTP FEC数据包总数。当使用媒体分组（例如，使用Opus）在带内发送FEC分组时，该计数器也可以递增。
bytesSent    | unsigned long long | 为此SSRC发送的总字节数。
bytesDiscardedOnSend    | unsigned long long | 由于套接字错误而丢弃的此SSRC的总字节数，即在将包含字节的数据包处理到套接字时发生套接字错误。这可能由于各种原因而发生，包括完全缓冲或无可用内存。

"RTCInboundRtpStreamStats"对象具有的属性如下：

字段 | 值类型 | 说明
----|------|----
trackId   | DOMString | 表示接收轨道的stats对象的标识符，RTCReceiverAudioTrackAttachmentStats或RTCReceiverVideoTrackAttachmentStats。
receiverId   | DOMString | 用于查找接收此流的RTCAudioReceiverStats或RTCVideoReceiverStats对象的统计信息ID。
remoteId  | DOMString | remoteId用于查找同一SSRC的远程RTCRemoteOutboundRtpStreamStats对象。
framesDecoded   | DOMString | 仅对视频有效。它表示为该SSRC正确解码的帧的总数，即，如果没有丢弃帧则将显示的帧。
lastPacketReceivedTimestamp   | DOMHighResTimeStamp | 表示为此SSRC接收最后一个数据包的时间戳。
averageRtcpInterval   | double | 两个连续复合RTCP数据包之间的平均RTCP间隔。这是在发送复合RTCP报告时由发送端点计算的。复合数据包必须至少包含RTCP RR或SR数据包以及带有CNAME项的SDES数据包。
fecPacketsReceived   | unsigned long | 此SSRC收到的RTP FEC数据包总数。当使用媒体分组（例如，使用Opus）在带内接收FEC分组时，该计数器也可以递增。
bytesReceived   | unsigned long long   | 此SSRC收到的总字节数。
packetsFailedDecryption   | unsigned long  | 根据[RFC3711]中的过程无法解密的RTP数据包的累计数量。packetsDiscarded不会对这些数据包进行计数。
packetsDuplicated   | unsigned long  | 丢弃的累积数据包数，因为它们是重复的。PacketDiscarded中不会计算重复的数据包。
perDscpPacketsReceived   | unsigned long | 根据差分服务代码点（Differentiated Services code point, DSCP）[RFC2474]，为此SSRC接收的数据包总数。 DSCP以字符串形式标识为十进制整数。请注意，由于网络重新映射和清除，这些数字预计不会与发送时看到的数字相匹配。并非所有操作系统都提供此信息。

"RTCRemoteInboundRtpStreamStats"对象具有的属性如下：

字段 | 值类型 | 说明
----|------|----
localId    | DOMString | localId用于查找同一SSRC的本地RTCOutboundRtpStreamStats对象。
roundTripTime    | double | 根据RTCP接收器报告（RR）中的RTCP时间戳估算此SSRC的往返时间，并以秒为单位进行测量。
fractionLost   | double| 报告此SSRC的分数丢包。

"RTCOutboundRtpStreamStats"对象具有的属性如下：

字段 | 值类型 | 说明
----|------|----
trackId   | DOMString | 表示发送轨道的stats对象的标识符，RTCReceiverAudioTrackAttachmentStats或RTCReceiverVideoTrackAttachmentStats。
receiverId   | DOMString | 用于查找发送此流的RTCAudioReceiverStats或RTCVideoReceiverStats对象的统计信息ID。
remoteId  | DOMString | remoteId用于查找同一SSRC的远程RTCRemoteOutboundRtpStreamStats对象。
lastPacketReceivedTimestamp   | DOMHighResTimeStamp | 表示为此SSRC接收最后一个数据包的时间戳。
targetBitrate    | double | 它是为此特定SSRC配置的当前目标比特率，并且是特定于传输的应用程序（Transport Independent Application Specific,TIAS）比特率[RFC3890]。通常，目标比特率是提供给编解码器编码器的配置参数，不计算IP或TCP或UDP等其他传输层的大小。它以每秒位数为单位测量，比特率在1秒窗口内计算。
framesEncoded    | long | 仅对视频有效。 它表示为此RTP媒体流成功编码的帧总数。
totalEncodeTime   | double | 编码此流的framesEncoded帧所花费的总秒数。可以通过将此值除以framesEncoded来计算平均编码时间。编码一帧所花费的时间是在向编码器馈送帧和编码器返回该帧的编码数据之间经过的时间。这不包括将结果数据打包所需的任何额外时间。
averageRtcpInterval    | double | 两个连续复合RTCP数据包之间的平均RTCP间隔。这是在发送复合RTCP报告时由发送端点计算的。复合数据包必须至少包含RTCP RR或SR数据包以及带有CNAME项的SDES数据包。
qualityLimitationReason   | RTCQualityLimitationReason | 仅对视频有效。限制分辨率和/或帧速率的当前原因，或者如果不限制则为“无”。
qualityLimitationDurations  | double | 仅对视频有效。 此流在每个质量限制状态中花费的总时间（以秒为单位）的记录。该记录包括所有RTCQualityLimitationReason类型的映射，包括“none”。
perDscpPacketsSent   | unsigned long | 每个DSCP为此SSRC发送的数据包总数。DSCP以字符串形式标识为十进制整数。

"RTCRemoteOutboundRtpStreamStats"对象具有的属性如下：

字段 | 值类型 | 说明
----|------|----
trackId   | DOMString | localId用于查找同一SSRC的本地RTCOutboundRtpStreamStats对象。
roundTripTime    | double | 根据RTCP接收器报告（RR）中的RTCP时间戳估算此SSRC的往返时间，并以秒为单位进行测量。
fractionLost   | double| 报告此SSRC的分数丢包。

"RTCRtpContributingSourceStats"对象表示有助于传入RTP流的贡献源（CSRC）的度量指标。
每个贡献源产生RTP分组流，其由混合器组合成单个RTP分组流，最终由WebRTC端点接收。
可以在CSRC列表或接收到的RTP分组的[RFC6465]报头扩展中提供关于对该组合流做出贡献的源的信息。
此stats对象的时间戳是由sourcesContributedTo接收和计数的源贡献的RTP数据包的最新时间。

"RTCRtpContributingSourceStats"对象具有的属性如下：

字段 | 值类型 | 说明
----|------|----
contributorSsrc    |  unsigned long | 此统计对象表示的贡献源的SSRC标识符，由[RFC3550]定义。它是一个32位无符号整数，出现在相关源所贡献的任何数据包的CSRC列表中。
inboundRtpStreamId   | DOMString | RTCInboundRtpStreamStats对象的ID，表示此贡献源所贡献的入站RTP流。
packetsContributedTo   |  unsigned long| 此贡献源所贡献的RTP数据包总数。每次RTCInboundRtpStreamStats.packetsReceived对数据包进行计数时，此值都会递增。
audioLevel  | double| 如果最后收到的此源所贡献的RTP数据包包含[RFC6465]混音器到客户端音频级别标头扩展，则显示。audioLevel的值在0..1（线性）之间，其中1.0表示0 dBov，0表示静音，0.5表示声压级从0 dBov变化约6 dBSPL。


（5）与音频流相关的对象"RTCAudioSenderStats"、"RTCSenderAudioTrackAttachmentStats"、"RTCAudioReceiverStats"和"RTCAudioHandlerStats"（4个）

"RTCAudioSenderStats"对象具有的属性如下：

字段 | 值类型 | 说明
----|------|----
echoReturnLoss   | double | 仅在发送方发送的track源来自应用了回声消除的麦克风时才出现。
echoReturnLossEnhancement   | double | 仅在发送方发送的track源来自应用了回声消除的麦克风时才出现。
totalSamplesSent  | unsigned long long | 此发件人已发送的样本总数。

"RTCSenderAudioTrackAttachmentStats"对象属性与"RTCAudioSenderStats"对象一致？？？


"RTCAudioReceiverStats"对象具有的属性如下：

字段 | 值类型 | 说明
----|------|----
estimatedPlayoutTimestamp | DOMHighResTimeStamp | 这是此接收器轨道的估计播出时间。 播出时间是具有已知时间戳（从RTCP SR数据包映射RTP时间戳到NTP时间戳）的最后一个可播放样本的NTP时间戳，用从准备好播放起经过的时间推断出来。 这是发送方的NTP时钟时间中的轨道的“当前时间”，即使当前没有音频播放也可以存在。
jitterBufferDelay  | double | 它是每个样本从接收到退出抖动缓冲区之间的时间总和，以秒为单位。此时间在样本退出时增加，在到达缓冲区完成。可以通过将jitterBufferDelay除以jitterBufferEmittedCount来计算平均抖动缓冲延迟。
jitterBufferEmittedCount   | unsigned long long | 从抖动缓冲区中出来的样本总数。
totalSamplesReceived  | unsigned long long | 此接收器已接收的样本总数。 这包括concealedSamples。
concealedSamples   | unsigned long long | 隐藏样本的样本总数。 隐藏样本是基于合成的数据以隐藏数据包丢失并且不表示传入数据的样本。
concealmentEvents    | unsigned long long | 隐藏事件的数量。每次在非隐藏样本之后合成隐藏样本时，该计数器都会增加。也就是说，多个连续隐藏的样本将多次增加隐藏的样本计数，但是仅是单个隐藏事件。


"RTCAudioHandlerStats"对象具有的属性如下：

字段 | 值类型 | 说明
----|------|----
audioLevel    | double | audioLevel表示轨道的输出音频电平; 因此，如果轨道来自RTCReceiver，没有音频处理，具有恒定电平，并且音量设置为1.0，则音频电平应该与源SSRC的音频电平相同，而如果音量设置为0.5，audioLevel预计为该值的一半。
totalAudioEnergy    | double | 此值必须按如下方式计算：对于此对象发送/接收的每个音频样本（由totalSamplesSent或totalSamplesReceived计数），将样本的值除以最高强度可编码值，平方，然后乘以样本的持续时间。换句话说，持续时间* Math.pow（energy/maxEnergy，2）。
voiceActivityFlag   | boolean | 根据[RFC6464]中的定义，基于扩展头中V位的存在，该轨道发送或播放的最后一个RTP分组是否包含语音活动。
totalSamplesDuration    | double| 表示已发送或已接收的所有样本的总持续时间（以秒为单位）。可与totalAudioEnergy一起使用，以计算不同时间间隔内的平均音频电平。

（6）与视频流相关的对象"RTCVideoSenderStats"、"RTCSenderVideoTrackAttachmentStats"、"RTCVideoReceiverStats"和"RTCVideoHandlerStats"（4个）

"RTCVideoSenderStats"对象表示有关一个调用getStats的"RTCPeerConnection"对象的一个视频发送方的统计信息。只要通过addTrack或addTransceiver添加发件人，或通过媒体协商，它就会显示在统计信息中。
"RTCVideoSenderStats"对象具有的属性如下：

字段 | 值类型 | 说明
----|------|----
framesCaptured    | unsigned long long | 表示在编码之前为此RTCRtpSender捕获的帧总数
framesSent    | unsigned long long | 表示此RTCRtpSender发送的帧总数。
hugeFramesSent   | unsigned long long | 表示此RTCRtpSender发送的巨大帧的总数。根据定义，大帧是具有至少为帧平均大小的2.5倍的编码大小的帧。帧的平均大小定义为每秒的目标比特率除以帧编码时的目标fps。
keyFramesSent    | unsigned long long | 表示此RTCRtpSender发送的关键帧总数。

"RTCSenderVideoTrackAttachmentStats"对象属性与"RTCVideoSenderStats"对象一致？？？

"RTCVideoReceiverStats"对象表示有关一个调用getStats的"RTCPeerConnection"对象的一个视频接收器的统计信息。只要通过addTrack或addTransceiver或媒体协商添加RTCRtpReceiver，它就会出现在统计信息中。
"RTCVideoReceiverStats"对象具有的属性如下：

字段 | 值类型 | 说明
----|------|----
estimatedPlayoutTimestamp    | DOMHighResTimeStamp | 这是此接收器轨道的估计播出时间。 播出时间是具有已知时间戳的最后一个可播放视频帧的NTP时间戳，用从准备好播放起经过的时间推断出来。这是发送方的NTP时钟时间内的轨道的“当前时间”，即使当前没有正在播放的视频也可以存在。
jitterBufferDelay    | double | 它是每个样本从接收到退出抖动缓冲区之间的时间总和，以秒为单位。此时间在样本退出时增加，在到达缓冲区完成。可以通过将jitterBufferDelay除以jitterBufferEmittedCount来计算平均抖动缓冲延迟。
jitterBufferEmittedCount   | unsigned long long | 从抖动缓冲区中出来的样本总数。
framesReceived    | unsigned long | 表示此接收器收到的完整帧总数。收到完整帧后，该指标会递增。
keyFramesReceived    | unsigned long | 表示为此MediaStreamTrack接收的完整关键帧的总数，这是framesReceived的子集。framesReceived - keyFramesReceived为您提供收到的增量帧数。
framesDecoded   | unsigned long | 仅对视频有效。它表示为该SSRC正确解码的帧的总数。即，如果没有丢弃帧则将显示的帧。
framesDropped    | unsigned long | 丢弃的帧总数
partialFramesLost    | unsigned long | 丢失部分帧的累积数量。
fullFramesLost   | unsigned long | 累计丢失的全帧数。

"RTCVideoHandlerStats"对象具有的属性如下：

字段 | 值类型 | 说明
----|------|----
frameWidth    | unsigned long | 表示此轨道的最后处理帧的宽度。在处理第一帧之前，缺少此属性。
frameHeight    | unsigned long | 表示此轨道的最后处理帧的高度。在处理第一帧之前，缺少此属性。
framesPerSecond   | double | 表示应用降级首选项之前的标称FPS值。它是最后一秒中完整帧的数量。对于发送轨道，它是当前捕获的FPS，对于接收轨道，它是当前的解码帧速率。


（7）与数据通道相关的对象（2个）

"RTCDataChannelStats"对象，其具有的属性如下：

字段 | 值类型 | 说明
----|------|----
label  | DOMString | RTCDataChannel对象的“label”值。
protocol  | DOMString | RTCDataChannel对象的“协议”值。
dataChannelIdentifier | long | RTCDataChannel对象的“id”属性。
transportId   | DOMString | 用于传输此数据通道的传输的统计信息对象引用。
state  | RTCDataChannelState | RTCDataChannel对象的“readyState”值。
messagesSent  | unsigned long  | 表示发送的API“消息”事件的总数。
bytesSent  | unsigned long long  | 表示在此RTCDatachannel上发送的有效负载字节总数，不包括标头或填充。
messagesReceived  | unsigned long  | 表示收到的API“消息”事件的总数。
bytesReceived  | unsigned long long  | 表示在此RTCDatachannel上收到的有效负载字节总数，不包括标头或填充。

"RTCPeerConnection"对象具有的属性如下：

字段 | 值类型 | 说明
----|------|----
dataChannelsOpened | unsigned long | 表示在其生命周期内进入“打开”状态的唯一DataChannel的数量。
dataChannelsClosed | unsigned long | 表示在其生命周期内离开“打开”状态的唯一DataChannel的数量。 从“连接”转换为“关闭”或“关闭”甚至没“打开”的DataChannel不计入此数字。
dataChannelsRequested  | unsigned long | 表示从RTCPeerConnection上成功的createDataChannel（）调用返回的唯一DataChannel的数量。 如果未建立基础数据传输，则这些传输可能处于“连接”状态。
dataChannelsAccepted  | unsigned long | 表示在RTCPeerConnection上的“datachannel”事件中发出信号的唯一DataChannel的数量。

（8）与编码器相关的对象（1个）

"RTCCodecStats"对象具有的属性如下：

字段 | 值类型 | 说明
----|------|----
payloadType   | DOMString | 有效载荷类型，用于RTP编码或解码。
codecType   | RTCCodecType | “编码”或“解码”，取决于该对象是否表示实现准备编码或解码的媒体格式。
transportId  | DOMString | 正在使用此编解码器的传输的唯一标识符，可用于查找相应的RTCTransportStats对象。
mimeType    | DOMString | 编解码器MIME媒体类型/子类型。例如，video / vp8或同等的。
clockRate   | unsigned long  | 表示媒体采样率。
channels   | unsigned long  | 使用2表示立体声，大多数情况下都不见。
sdpFmtpLine   | DOMString| ？？？
implementation   | DOMString  | 标识使用的实现。这对于诊断互操作性问题很有用。

（9） 其它（1个）

"RTCQualityLimitationReason"对象的值是枚举类型，该属性仅对视频有效。表示限制分辨率和/或帧速率的当前原因。

原因 | 说明
----|----
none| 分辨率和/或帧速率不受限制。
cpu  | 由于CPU负载，分辨率和/或帧速率主要受限。
bandwidth  | 由于带宽估计期间的拥塞提示，分辨率和/或帧速率主要受限。典型的拥塞控制算法使用到达间隔时间，往返时间，分组或其他拥塞提示来执行带宽估计。
other |  分辨率和/或帧率主要受限于上述以外的原因。


### 4. Chrome下getStats()字段对比{#4}

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

比如，通过localCertificateId或remoteCertificateId，我们可以获取证书对象信息，即源码中对应dtls传输的状态信息。

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

然后，"RTCTransport_video_1"或"RTCTransport_audio_1"对象中另一个非常重要的字段就是selectedCandidatePairId，顾名思义，selectedCandidatePairId代表着选取的ICE连接方式，即源码中对应ice收集和传输的状态信息。

selectedCandidatePairId常见值形式如下："RTCIceCandidatePair_[8位编码]\_[8位编码]"，例如"RTCIceCandidatePair\_+SgV3pPQ_mWR7jqSK"，每一个拼接的字符串代表着一种候选的ICE连接方式，通常webrtc会分别列出5种本地和远程可以进行的ICE候选方式，使用"RTCIceCandidate_[8位编码]"可以获取该种ICE连接方式的信息对象。

"RTCIceCandidate_[8位编码]"字段的对象属性如下：

字段 | 值类型 | 说明
----|------|----
candidateType | 字符串  | 候选方式类型，常见值为"host"
deleted | 布尔  | 候选方式是否删除
ip | 字符串  | 形如"2001:db8:1:3:79ac:28a4:e937:ce6a"，有的加密有的不加密？？
id | 字符串  | 与键值一致
isRemote | 布尔 | 是否是远程，本地为false，远程为true
networkType | 字符串  | 网络类型，比如"ethernet"，"wifi","cellular"等
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
consentRequestsSent | 数值  | 表示已发送的同意请求的总数。
currentRoundTripTime | 数值  | 当前路由往返时间
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
availableOutgoingBitrate | 数值 | 通过使用该候选对组合所有输出RTP流的可用比特率，通过基础拥塞控制来计算它。 比特率测量不计算IP或TCP或UDP等其他传输层的大小。 它类似于[RFC3890]中定义的TIAS，即，它以每秒位数为单位进行测量，并且在1秒窗口内计算比特率。
availableIncomingBitrate | 数值 | 通过使用该候选对组合所有传入RTP流的可用比特率，通过基础拥塞控制来计算它。 比特率测量不计算IP或TCP或UDP等其他传输层的大小。 它类似于[RFC3890]中定义的TIAS，即，它以每秒位数为单位进行测量，并且在1秒窗口内计算比特率。

此处还有一个疑问就是如何进行配对选择，webrtc这里并没有提供全部25种配对方式，仅仅提供了6种配对方式？还是说这6种配对方式是25种配对方式中较优的？？？

证书和ICE状态确定之后，我们还需要知道信道和视频、音频流的一些状态信息，即源码中对应rtp接收、发送的状态信息。

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
ssrc | 数值  | 32位整数，用于标识此RTCRtpStreamStats对象所涵盖的RTP数据包的来源。
trackId | 布尔  | 与"RTCMediaStream_[36位编码]"对象中trackIds中元素一致
transportId | 布尔  | 与一开始所述的"RTCTransport_video_1"或"RTCTransport_audio_1"相关联
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
firCount | 数值 | 发送方收到的全内部请求（Full Intra Request，FIR）数据包总数的计数。 此统计信息仅适用于接收流的设备，仅适用于视频轨道。
nackCount | 数值 | 接收方通过向发送方发送否定确认（Negative ACKnowledgement，NACK）数据包通知发送方已丢失一个或多个RTP数据包的次数。 该值仅适用于接收方。
pliCount | 数值 | 流的接收端向发送方发送图片丢失指示（Picture Loss Indiciation，PLI）分组的次数，表示它已经丢失了一些或多个帧的一些编码视频数据。只有接收器具有此值，并且它仅对视频轨道有效。
kind | 字符串 | 视频流值为"video"
mediaType | 字符串 |视频流值为"video"
isRemote | 布尔 |是否为远程
qpSum | 数值  | 与此RTCRtpStreamStats对象描述的视频轨道上迄今接收的每个帧相关联的量化参数（Quantization Parameter，QP）值的总和。 通常，此数字越高，视频轨道的压缩程度越高。 结合RTCReceivedRtpStreamStats.framesDecoded或RTCSentRtpStreamStats.framesEncoded，您可以近似这些帧的平均QP，请记住编解码器通常会在帧内改变量化器值。另请注意，QP的值可能因编解码器而异，因此只有在与相同的编解码器进行比较时，此值才有用。
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


### 5. FireFox下getStats()字段对比{#5}


### 6. Microsoft Edge下getStats()字段对比{#6}


### 7. 应用封装{#7}
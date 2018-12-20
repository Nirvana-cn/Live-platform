# SDP字段全解析

详细的[文档](https://webrtchacks.com/sdp-anatomy/)

更详细的[官方文档](https://tools.ietf.org/id/draft-nandakumar-rtcweb-sdp-01.html)

SDP里面内容虽然很多，但是条理很清楚。SDP值为字符串，通过换行符生成一行一行的SDP报文，所有行可分为三类：全局行、音频行、视频行

## 1. 全局行

> v=0

sdp版本号，一直为0,rfc4566规定

> o=- 7017624586836067756 2 IN IP4 127.0.0.1

第一个数字是会话ID，会话的唯一标识符。
第二个位置的数字 - 2 - 是会话版本：如果在此媒体会话期间需要新的提议/应答协商，则该数字将增加1。
同样的，当需要在媒体会话中更改任何参数（例如保持，编解码器更改，添加 - 删除媒体轨道）时，该数字也将增加1。
以下三个字段是网络类型（Internet），IP地址类型（版本4）和创建SDP的计算机的单播地址。这三个值与谈判无关。

> s=-

会话名，没有的话使用 - 代替

> t=0 0

它给出了开始和结束时间。
当它们像我们的情况一样被设置为0时，意味着会话不受特定时间限制,换句话说，它在任何时候都是永久有效的。

> a=group:BUNDLE audio video

BUNDLE分组建立了SDP中包含的几个媒体线之间的关系，通常是音频和视频。在WebRTC中，它用于在相同的RTP会话中复用多个媒体流。
在这种情况下，浏览器提供多路复用音频和视频，但另一方也必须支持和接受。
如果没有这一行，音视频，数据就会分别单独用一个udp端口来发送

> a=msid-semantic: WMS h1aZ20mbQB0GSsq0YxLfJmiYWE9CBfGch97C

WMS是WebRTC Media Stream简称，这一行定义了本客户端支持同时传输多个流，一个流可以包括多个track,
一般定义了这个，后面a=ssrc这一行就会有msid,mslabel等属性

## 2. 音频行

> m=audio 9 UDP/TLS/RTP/SAVPF 111 103 104 9 0 8 106 105 13 126

m=audio说明本会话包含音频，9代表音频使用端口9来传输，但是在webrtc中一现在一般不使用，如果设置为0，代表不传输音频,
UDP/TLS/RTP/SAVPF是表示用户来传输音频支持的协议，udp，tls,rtp代表使用udp来传输rtp包，并使用tls加密SAVPF代表使用srtcp的反馈机制来控制通信过程,
后台111 103 104 9 0 8 106 105 13 126表示本会话音频支持的编码。

> c=IN IP4 0.0.0.0

这一行表示你要用来接收或者发送音频使用的IP地址，webrtc使用ice传输，不使用这个地址

> a=rtcp:9 IN IP4 0.0.0.0

明确指定传输RTCP的IP和端口，而不是从基础媒体端口派生的。请注意，与SRTP的端口相同，因为支持RTCP Multiplex。webrtc中不使用。

> a=mid:audio

在前面BUNDLE这一行中用到的媒体标识。如果我们有不同的媒体，我们每个都应该有不同的标识符。

> a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level

此行定义将在RTP标头中使用的扩展，以便接收器可以正确解码并提取元数据。

> a=sendrecv

上一行指出我是双向通信，另外几种类型是recvonly,sendonly,inactive。

> a=rtcp-mux

指出rtp,rtcp包使用同一个端口来传输

#### 2.1 ICE候选者

> a=candidate:1467250027 1 udp 2122260223 192.168.0.196 46243 typ host generation 0

> a=candidate:1467250027 2 udp 2122260222 192.168.0.196 56280 typ host generation 0

UDP上RTP的主机候选者 - 在此ICE行中，我们的浏览器为其主机候选者 - 浏览器正在计算机上监听的接口或接口的IP。
浏览器可以在该IP上接收/发送SRTP和SRTCP，以防远程对等端的候选者具有IP可见性。例如，如果另一台计算机位于同一LAN上，则将使用主机候选项。
协议（udp） - 2122260223之后的数字是候选者的优先级。请注意，宿主候选者的优先级高于其他候选者，
因为使用宿主候选者在资源使用方面更有效。第一行（component = 1）用于RTP，第二行（component = 2）用于RTCP。
请注意，浏览器不知道另一端是否支持rtcp-mux，因此它必须在要约中包含RTCP端口。

> a=candidate:435653019 1 tcp 1845501695 192.168.0.196 0 typ host tcptype active generation 0

> a=candidate:435653019 2 tcp 1845501695 192.168.0.196 0 typ host tcptype active generation 0

TCP上RTP的主机候选者 - 这些线路与之前的两条ICE线路相同，但是对于TCP流量。
请注意，优先级较低 - 即1845501695较大 - 因为TCP不是实时媒体传输的最佳选择。

> a=candidate:1853887674 1 udp 1518280447 47.61.61.61 36768 typ srflx raddr 192.168.0.196 rport 36768 generation 0

> a=candidate:1853887674 2 udp 1518280447 47.61.61.61 36768 typ srflx raddr 192.168.0.196 rport 36768 generation 0

UDP上RTP的自反性候选者(reflexive candidates) - 这里我们有服务器反身候选人。
请注意，它们的优先级低于主机候选者。 这些候选人是由STUN服务器发现的。

> a=candidate:750991856 2 udp 25108222 237.30.30.30 51472 typ relay raddr 47.61.61.61 rport 54763 generation 0

> a=candidate:750991856 1 udp 25108223 237.30.30.30 58779 typ relay raddr 47.61.61.61 rport 54761 generation 0

UDP上RTP的中继候选者(Relay candidates) - 接下来我们有中继候选。这些候选者是从TURN服务器获得的，必须在创建对等连接时进行配置。
请注意，此处的优先级低于主机和反射候选者（25108222更高），因此仅当主机和反射候选者之间没有IP连接时才使用中继。

#### 2.2 ICE参数

> a=ice-ufrag:khLS

> a=ice-pwd:cxLzteJaJBou3DspNaPsJhlQ

以上两行是ice协商过程中的安全验证信息

#### 2.3 DTLS参数

> a=fingerprint:sha-256 FA:14:42:3B:C7:97:1B:E8:AE:0C2:71:03:05:05:16:8F:B9:C7:98:E9:60:43:4B:5B:2C:28:EE:5C:8F3:17

此指纹是DTLS-SRTP协商中使用的证书的哈希函数的结果。
此行在信令（应该是可信的）和DTLS中使用的证书之间创建绑定，如果指纹不匹配，则应拒绝会话。

> a=setup:actpass

代表本客户端在dtls协商过程中，可以做客户端也可以做服务端

#### 2.4 Codec参数

> a=rtpmap:111 opus/48000/2

Opus是WebRTC的MTI音频编解码器之一。 它具有可变比特率（6kbps-510kbps），并且不受任何版税限制，因此可以在任何浏览器中自由实现。
Opus支持开始变得普遍，它已成为大多数WebRTC应用程序的关键。

> a=fmtp:111 minptime=10; useinbandfec=1

此行包括Chrome支持的音频Opus编解码器的可选有效载荷格式特定参数。
minipitime = 10指定分组化时间的最低值（ptime：由单个分组传输的音频的毫秒数）。
useinbandfec = 1指定解码器能够利用Opus带内FEC（前向错误连接）。

> a=rtpmap:103 ISAC/16000

ISAC（互联网语音音频编解码器）是用于高质量会议的宽带语音编解码器。
16000表示ISAC将以16kbps的速度使用。

> a=rtpmap:104 ISAC/32000

32000表示ISAC将以32kbps的速度使用。

> a=rtpmap:9 G722/8000

G722是一款工作频率为48,56和64 kbit/s的宽带音频编解码器，与G.711等窄带语音编码器相比，由于50-7000 Hz的语音带宽更宽，因此可提供更高的语音质量。

> a=rtpmap:0 PCMU/8000

> a=rtpmap:8 PCMA/8000

这是使用不同压扩法则的经典电信64kbps脉冲编码调制（PCM）编解码器。
0和8分别是PCMU和PCMA的静态有效载荷类型。从技术上讲，这些线路不存在，因为这些信息可以通过媒体线中的编解码器列表 -  PCMU或PCMA来推断。

> a=rtpmap:106 CN/32000

> a=rtpmap:105 CN/16000

> a=rtpmap:13 CN/8000

上面的动态RTP有效载荷类型（除了有效载荷类型13，它是静态的）表示舒适噪声（Comfort Noise, CN）将用于速率为48000,32000,16000和8000kbits/s的编解码器。

> a=rtpmap:126 telephone-event/8000

此行表示浏览器支持RFC4733，允许它在RTP内发送DTMF，而不是通常的数字化正弦波，而是作为特殊有效载荷（在这种情况下，RTP数据包中有效载荷126）。
该DTMF机制确保DTMF将独立于音频编解码器和信令协议进行传输。

> a=maxptime:60

maxptime指定可以封装在每个数据包中的最大媒体数量，以毫秒为单位表示。数据包的大小可能会对音频和BW的质量产生副作用。可以在SDP中修改此值。


#### 2.5 SSRC参数

> a=ssrc:3570614608 cname:4TOk42mSjXCkVIa6

cname源属性将媒体源与其Canonical端点标识符相关联，即使在发现冲突时ssrc标识符发生更改，该标准端点标识符也将保持RTP媒体流的常量。
这是媒体发送方将在其RTCP SDES数据包中放置的值。

> a=ssrc:3570614608 msid:lgsCFqt9kN2fVKw5wg3NKqGdATQoltEwOdMS 35429d94-5637-4686-9ecd-7d0622261ce8

该线用于使用SDP信令通知SSRC的RTP概念与“媒体流”/“媒体流轨道”的WebRTC概念之间的关联。
第一个参数对应于媒体流(media stream)的id，第二个参数对应于媒体流轨道的if。这些ID在WebRTC API中处理。
第一个数字是SSRC标识符，它将包含在RTP数据包的SSRC字段中。

> a=ssrc:3570614608 mslabel:lgsCFqt9kN2fVKw5wg3NKqGdATQoltEwOdMS

label属性指的是Media Stream对象的id。不推荐使用该参数，并将msid替换为该参数。标签是为了向后兼容而保留。

> a=ssrc:3570614608 label:35429d94-5637-4686-9ecd-7d0622261ce8

label属性也被msid弃用，并在使用SDP的任意网络应用程序的上下文中携带指向RTP媒体流的指针。
此标签与WebRTC API中的Media Stream Track ID相对应，该ID包含在msid行中。


## 3.视频行

> m=video 60372 UDP/TLS/RTP/SAVPF 100 101 116 117 96

m=video说明本会话包含音频，60372代表视频使用端口60372来传输，但是在webrtc中一现在一般不使用，如果设置为0，代表不传输音频,
UDP/TLS/RTP/SAVPF是表示用户来传输视频支持的协议，udp，tls,rtp代表使用udp来传输rtp包，并使用tls加密SAVPF代表使用srtcp的反馈机制来控制通信过程,
后台100 101 116 117 96表示本会话视频支持的编码。

> c=IN IP4 217.130.243.155

c是连接线。此行提供您希望发送和接收实时流量的IP。由于ICE在WebRTC中是强制性的，因此不会使用该IP。

> a=rtcp:64891 IN IP4 217.130.243.155

如果另一个对等体不支持RTCP多路复用，则此行指定将用于RTCP的IP和端口。

> a=mid:video

> a=extmap:2 urn:ietf:params:rtp-hdrext:toffset

> a=extmap:4 urn:3gpp:video-orientation

此extmap行（RTP标头扩展在IETF RFC 5285中指定）表示Chrome支持在SDP中为包含视频的所有媒体流协调视频定向（CVO）。
简而言之，此扩展允许通知相机到另一侧的方向，以便可以正确显示。
视频方向的协调包括将在发送方侧捕获的图像的当前方向发信号通知给接收方以进行适当的呈现和显示。

> a=sendrecv

> a=rtcp-mux

#### 3.1 ICE候选者

> a=candidate:1467250027 1 udp 2122260223 192.168.0.196 56143 typ host generation 0

> a=candidate:1467250027 2 udp 2122260222 192.168.0.196 58874 typ host generation 0

> a=candidate:435653019 1 tcp 1518280447 192.168.0.196 0 typ host tcptype active generation 0

> a=candidate:435653019 2 tcp 1518280446 192.168.0.196 0 typ host tcptype active generation 0

> a=candidate:1853887674 1 udp 1518280447 47.61.61.61 36768 typ srflx raddr 192.168.0.196 rport 36768 generation 0

> a=candidate:1853887674 1 udp 1518280447 47.61.61.61 36768 typ srflx raddr 192.168.0.196 rport 36768 generation 0

> a=candidate:750991856 1 udp 25108223 237.30.30.30 60372 typ relay raddr 47.61.61.61 rport 54765 generation 0

> a=candidate:750991856 2 udp 25108222 237.30.30.30 64891 typ relay raddr 47.61.61.61 rport 54767 generation 0

#### 3.2 ICE参数

> a=ice-ufrag:Oyef7uvBlwafI3hT

> a=ice-pwd:T0teqPLNQQOf+5W+ls+P2p16

#### 3.3 DTLS参数

> a=fingerprint:sha-256 49:66:12:17:0D:1C:91:AE:57:4C:C6:36:DD:D5:97:D2:7D:62:C9:9A:7F:B9:A3:F4:70:03:E7:43:91:73:23:5E

> a=setup:actpass

#### 3.4 Codec参数

> a=rtpmap:100 VP8/90000

这条线表示VP8与有效载荷类型100对齐。这意味着此会话中包含VP8视频帧的RTP数据包的有效载荷类型字段的值将为100.
现在VP8是视频的MTI编解码器，未来可能会发生变化。

> a=rtcp-fb:100 ccm fir

指明使用全内帧请求(Full Intraframe Request, FIR)

> a=rtcp-fb:100 nack

此行请求使用RFC 4585中指示的否定ACK（nack）。这允许另一端知道数据包丢失。

> a=rtcp-fb:100 nack pli

此行表明支持PLI NACK RTCP消息。 这允许在视频包丢失时向另一端点请求新的VP8关键帧。

> a=rtcp-fb:100 goog-remb

它定义了RTCP消息对Receiver Estimated Maximum Bitrate的使用。前缀goog-意味着仍然只能由Google和非标准实现。

> a=rtpmap:101 VP9/90000

Chrome支持版本48的VP9。您可以在Web M项目站点了解此视频编解码器的功能。 默认情况下，它在VP8之后显示为SDP中的第二个选项。

> a=rtcp-fb:101 ccm fir

> a=rtcp-fb:101 nack

> a=rtcp-fb:101 nack pli

> a=rtcp-fb:101 goog-remb

> a=rtpmap:116 red/90000

该行请求使用RFC2198，其定义有效载荷格式以编码冗余媒体数据。在WebRTC中，这用于封装有效载荷VP8（视频有效载荷本身）和FEC(Forward Error Correction)。

> a=rtpmap:117 ulpfec/90000

此行请求使用ULP FEC（在RFC5109中定义）。 FEC（前向纠错）允许通过基于原始分组发送冗余信息来纠正数据传输中的某种错误。
当丢包（在RTCP-RR数据包中报告）时使用FEC。

> a=rtpmap:96 rtx/90000

参数rtx和apt在RFC4588中定义。 该RFC定义了RTP有效载荷格式，仅用于执行另一方尚未接收的分组的重传。
无法使用原始有效负载重新发送数据包，因为它会破坏RTP和RTCP机制，因此它们会在具有不同有效负载的重新传输流中重新传输。
90000指的是重传流的时钟速率，其与原始VP8流相同，原始VP8流与其他视频协议90000相同。

> a=fmtp:96 apt=100

该行表示具有有效载荷96的RTP分组将传输那些已经在该SDP（VP8）中对有效载荷100进行了编码的编解码器的rtx消息。

#### 3.5 SSRC参数

> a=ssrc-group:FID 2231627014 632943048

此行声明SSRC 632943048是RFC5576中指定的2231627014的rtx修复流程

> a=ssrc:2231627014 cname:4TOk42mSjXCkVIa6

> a=ssrc:2231627014 msid:lgsCFqt9kN2fVKw5wg3NKqGdATQoltEwOdMS daed9400-d0dd-4db3-b949-422499e96e2d

> a=ssrc:2231627014 mslabel:lgsCFqt9kN2fVKw5wg3NKqGdATQoltEwOdMS

> a=ssrc:2231627014 label:daed9400-d0dd-4db3-b949-422499e96e2d

** 注：未特别说明，则与audio一致








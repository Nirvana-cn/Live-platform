简而言之，RTCP提供了大规模应用RTP所需的统计和控制机制。

要了解这种差异，首先需要对RTP有充分的了解。
RTP（实时传输协议）旨在为传输实时数据的应用程序提供端到端网络传输，
例如通过多播或单播网络服务的音频或视频。
在这样做时，RTP不处理重要的事情，
如确保服务质量或RTP接收器准备好并能够接收数据。
这是RTCP的工作，它允许以可扩展到大型多播网络的方式监控数据传输，
并提供最小的控制和识别功能。

http://jumboframe.net/jumboframe/2013/7/9/the-difference-between-rtp-and-rtcp
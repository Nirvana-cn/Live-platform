## 基于WebRTC的在线直播系统
目录下安装包依赖
```
npm install
```
浏览打开127.0.0.1:3003，主播用户名为 000，开启直播。

获取当前连接状态需要websocket服务器的支持，在wsServer目录下运行，

```
npm install
```

安装完成之后运行websocket服务（对于mongodb存储部分代码可先行注释掉）

```
node server.js
```

---

server代码量较少，服务器主要提供数据交换的功能，主要逻辑集中在html页面中。

主要流程如下：

1. 用户输入用户名，服务器对获取到的用户名进行验证，如果是主播则触发live事件；

2. 主播触发live事件后，获取视频流，等待watcher的连接；

3. 对于非主播的用户名，则定义为watcher，用一个map结构保存所有的watcher同辈连接(RTCPeerConnection)；

4. 进行WebRTC连接的相关工作，通过服务器发送offer，answer和icecandidate

个人博客：[如何建立WebRTC连接](https://juejin.im/post/6844903624561147918)

未来计划：

1. 添加登录验证（用户名、密码、手机验证码、cookie），优化用户界面
2. 弹幕效果
3. 移动端自适应

正在Flutter平台上实现上面的计划😄

传送门：[Flutter WebRTC APP](https://github.com/Nirvana-cn/flutter_webrtc_app)

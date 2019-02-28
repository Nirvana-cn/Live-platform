## track API 注意点

- addTrack
- removeTrack
- replaceTrack
- ontrack事件

`addTrack`需要两个参数。
```javascript
let track = stream.getTracks()[0]
sender = PeerConnection.addTrack(track,stream)
```

`removeTrack`的参数必须为`RTCRtpSender`类型，如 `PeerConnection.addTrack`的返回值，还可以通过`PeerConnection.getSenders()`得到。
```javascript
let track = stream.getTracks()[0]
sender = PeerConnection.addTrack(track,stream)
PeerConnection.removeTrack(sender)
```

`replaceTrack`是一个神器啊，`replaceTrack`可以轻松地替换媒体流，而不需要`negotiation`，唯一的要求就是替换的媒体流类型相同(audio, video, etc)。

同样的，`replaceTrack`是一个`RTCRtpSender`原型方法，所以`sender`必须是`RTCRtpSender`实例对象。
```javascript
let track = stream.getTracks()[0]
sender.replaceTrack(track).then(()=>{
    console.log('replace track success...')
})            
```

获取流，`streams`是一个数组对象。
```javascript
PeerConnection.ontrack = function (event) {
    video.srcObject = event.streams[0]
}
```

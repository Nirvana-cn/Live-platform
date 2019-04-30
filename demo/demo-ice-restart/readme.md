## ice restart

对于我们来说，iceConnectionState的值中我们所感兴趣的是disconnected和failed。简单的来说，disconnected是指连接被中断，但是还有可能不做任何工作就又可以重新连接。Failed状态更像是一个持续的错误状态，你需要将ICE重启才能解决这个问题。通常，当连接中断的时候，ICE连接状态先是变成disconnected，过一段时间状态会变为failed。

当ICE连接状态变成failed之后你就可以进行ICE重启了。这意味着你需要收集新的候选项，将他们送至对等端然后从对等端继续收集新的候选项。希望这样就可以把连接重新建立起来。你会注意到SDP中的ice-ufrag和ice-pwd属性发生了改变。将其发送给对等端，之后对等端将会用这些变了的参数产生新的应答。

```js
pc1.oniceconnectionstatechange = function (event) {
    if(pc1.iceConnectionState === 'failed'){
        pc1.createOffer({iceRestart: true})
    }
}
```
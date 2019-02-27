const WebSocket = require('ws')
let storage=new Map()
let method=new Map()
method.set('connect',function (ws,obj) {
    storage.set(obj.from, ws)
})
method.set('watch',function (ws, obj) {
    storage.get(obj.to).send(JSON.stringify({
        type:'watch',
        data:''
    }))
    console.log('发起观看请求...')
})
method.set('offer',function (ws, obj) {
    storage.get(obj.to).send(JSON.stringify({
        type:'offer',
        data:obj.data
    }))
    console.log('offer处理成功...')
})
method.set('answer',function (ws, obj) {
    storage.get(obj.to).send(JSON.stringify({
        type:'answer',
        data:obj.data
    }))
    console.log('answer处理成功...')
})

method.set('candidate',function (ws,obj) {
    storage.get(obj.to).send(JSON.stringify({
        type:'candidate',
        data:obj.data
    }))
    console.log('candidate处理成功...')
})


const server = new WebSocket.Server({ port: 3001 })

server.on('connection', function (ws) {
    ws.on('message', function (message) {
        let temp=JSON.parse(message)
        method.get(temp.type)(ws,temp)
    })
    ws.on('close',function () {
        console.log('断开连接...',storage.size)
    })

})

module.exports=server
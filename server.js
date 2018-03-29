var express=require('express')
var fs=require('fs')
var app=express()
var liveAddress=null
app.get('/',function (req, res) {
    fs.readFile('./index.html',function (error,data) {
        res.writeHead(200,{'Content-Type':'text/html'})
        res.end(data,'utf-8')
    })
})
var server=app.listen(3003,function () {
    console.log('Server is listening at http://localhost:3003')
})
var io=require('socket.io').listen(server)
io.on('connection',function (socket) {
    if(liveAddress !== null){
        socket.emit('welcome',liveAddress)
    }
    socket.on('live',function (data) {
        liveAddress=data
    })
    socket.on('watcher',function (data) {
        // watchers.push(data)
        io.emit('watcherAnswer',data)
    })
    socket.on('disconnect',function () {
        console.log("user has left.")
    })
})
var express=require('express')
var fs=require('fs')
var app=express()
var liveSDP=null
var liveAddress=null
var userNames=[]
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
    socket.on('userName',function (data, callback) {
        if(userNames.indexOf(data)!== -1){
            callback(false)
        }else{
            callback(true)
            if(data==='wuwei'){
                liveAddress=socket.id
                socket.emit('live')
            }else{
                userNames.push(data)
                socket.userName=data
                socket.emit('watch',liveSDP)
                io.to(liveAddress).emit('addWatcher')
            }
        }
    })


    socket.on('sendOffer',function (data) {
        liveSDP=data
    })

    socket.on('sendAnswer',function (data) {
        io.to(liveAddress).emit('watcherAnswer',data)
    })

    socket.on('anchorIce',function (data) {
        socket.broadcast.emit('receiveAnchorIce',data)
    })
    socket.on('watcherIce',function (data) {
        io.to(liveAddress).emit('receiveWatcherIce',data)
    })

    socket.on('disconnect',function () {
        console.log(socket.userName+" has left.")
        if(!socket.userName) return;
        if(userNames.indexOf(socket.userName)>-1){
            userNames.splice(userNames.indexOf(socket.userName),1)
            console.log(userNames)
        }
        socket.broadcast.emit('userNames',userNames)
        io.to(liveAddress).emit('watcherLeave')
    })
})
// var behaviourOperation = require('./databaseOperation/__connectDatabase_connection_behaviour')
// var statsOperation = require('./databaseOperation/__connectDatabase_connection_stats')
// var conferenceOperation =require('./databaseOperation/__connectDatabase_conference_information')
var WebSocketServer = require('ws').Server
var server = new WebSocketServer({port: 3001})

server.on('connection', function (ws, request) {
    console.log('client connetion')

    ws.on('open', function (event) {
        console.log('The p2p connection is establishment.' + event)
    })

    ws.on('close', function (event) {
        console.log('The p2p connection is closed.')
    })

    ws.on('error', function (error) {
        console.log('The p2p connection has an error.' + error)
    })

    ws.on('message', function (message) {
        // console.log('receive message from client: ' + message + '\n')
        // let temp = JSON.parse(message)
        // if (temp[0] === 'getstats') {
        //     statsOperation.insertData({userId: '123', stats: message, timeStamp: new Date()})
        // } else {
        //     behaviourOperation.insertData({userId: '123', behavior: message, timeStamp: new Date()})
        // }
    })
})

server.on('error', function (error) {
    console.log('This is an error: ' + error)
})

server.on('close', function () {
    console.log('The sever is closed.')
})

console.log('ws server is running at port: 3001')
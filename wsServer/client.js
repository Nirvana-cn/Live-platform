var ws = new WebSocket("ws://localhost:3001")
ws.onopen = function (e) {
    console.log('Connection is opened')
    ws.send('Hello server!')
}

ws.onclose = function (event) {
    console.log('Connection is closed')
}

ws.onerror = function (err) {
    console.log("This is an error " + err)
}

ws.onmessage = function (event) {
    console.log("Receive message from server: " + event.data)
}

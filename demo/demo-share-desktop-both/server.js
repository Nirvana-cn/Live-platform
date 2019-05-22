let ws=require('./websocket_server')
let fs=require('fs')
let Koa=require('koa')
let app=new Koa()

app.use(ctx => {
    ctx.type='html'
    ctx.body=fs.createReadStream('./index.html')
})

app.listen(3000)

console.log('Server is runing at http://localhost:3000')
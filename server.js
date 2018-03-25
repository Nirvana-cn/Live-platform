var express=require('express')
var fs=require('fs')
var app=express()
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
let webpack=require('webpack')
let path=require('path')
let htmlWebapckPlugin=require('html-webpack-plugin')

module.exports={
    entry: path.resolve(__dirname,'src/index.js'),
    output: {
        path:path.resolve(__dirname,'build'),
        filename:'bundle.js',
        chunkFilename:'[name].chunk.js'
    },
    devServer: {
        contentBase:'./build',
        host:'localhost',
        port:'8080',
        open:true,
        hot:true,
        inline:true,
        historyApiFallback:true
    },
    plugins:[
        new htmlWebapckPlugin({
            template:'./index.html',
            hash:true
        })
    ]
}
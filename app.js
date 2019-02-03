//expressの呼び出し

const express = require('express');
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const fs = require('fs');
const favicon = require('serve-favicon');
const dateUtils = require('date-utils');

const routes = require('./routes/index');
const users = require('./routes/users');

//getUserMediaのためのHTTPS化
const https = require('https');
//https鍵読み込み
const options = {
  key: fs.readFileSync(process.env.HTTPSKEY_PATH + 'privkey.pem'),
  cert: fs.readFileSync(process.env.HTTPSKEY_PATH + 'cert.pem')
}
const os = require('os');

const app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(bodyParser.json({limit: '100mb'}));
//app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.urlencoded({limit: '100mb', extended: true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(favicon(path.join(__dirname, 'lib/favicon.ico')));

//app.use('/', routes);

/* GET home page. */
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

//for live 20190202
app.get('/parade', (req, res, next) => {
  res.render('parade', {
    title: 'knd'
  });
})
app.get('/paradeCtrl', (req, res, next) => {
  res.render('paradeCtrl', {
    title: 'ctrl'
  });
})

let dt = new Date()
const logFilePath = "./log" + dt.toFormat("YYYYMMDDHH24MMSS") + ".csv"
let clientBuffer = []
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exportComponent = app;

let port = 3000;
//let port = 3333;
let server = https.createServer(options,app).listen(port);
let io = require('socket.io').listen(server);

if("en0" in os.networkInterfaces()){
  console.log("server start in " + os.networkInterfaces().en0[0]["address"] + ":" + String(port));
  console.log("server start in " + os.networkInterfaces().en0[1]["address"] + ":" + String(port));
} else {
  console.log("server start")
}


io.sockets.on('connection',(socket)=>{
  socket.on("disconnect", (socket) =>{
    if(String(socket.id) in clientsList){
      delete clientsList[String(socket.id)]
      console.log("disconnect")
      console.log(Object.keys(io.sockets.adapter.rooms))
    }
  })
    io.to("ctrl").emit("infoFromServer")
    dt = new Date()
    fs.appendFile(logFilePath, dt.toFormat("YYYY/MM/DD HH24:MI:SS") + ',' + String(socket.id) + ',disconnect\n', (err) => {
    })
    console.log("disconnect: " + socket.id);
  });

  socket.on("initFromClient", (data) => {
    if(data.getUserMedia != undefined) {
      if(data.getUserMedia) {
        socket.join("getUserMedia")
        console.log("getUserMedia join")
      } else {
        socket.join("notUserMedia")
        console.log("notUserMedia join")
      }
    }
    if(data.originX != undefined) {
      clientsList[String(socket.id)] = {
        originX: data.originX,
        originY: data.originY,
        getUserMedia: data.getUserMedia
      }
    }
    console.log("init")
    console.log(Object.keys(clientsList))
  })

  socket.on("instructionFromCtrl", (data) => {
    io.emit("instructionFromServer", data)
  })

  socket.on("freqFromClient", (data) => {
    for(let id in ios.sockets.adapter.rooms) {
      if(data.target === String(id)) {
        io.to(id).emit("freqFromServer", data.freq)
      }
    }
  })

  socket.on("readyFromClient", (data) => {
    console.log(data)
    switch(data) {
      case "TRADE":
        let targetArr = Object.keys(clientsList)
        targetArr.push(targetArr.shift())
        Object.keys(clientsList).forEach((element,index) => {
          clientsList[element].target = targetArr[index]
        })
        console.log(clientsList)
        for(let id in io.sockets.adapter.rooms){
          for(let key in clientsList){
            if(String(id) === key) {
              socket.to(id).emit("targetSendFromServer", {
                target: clientsList[key].target
              })
            }
          }
        }
        break;
      case "recordEnd": //later
        console.log("record end " + String(socket.id))
      break;
      case "RECORD":
        io.emit("recReqFromServer")
        break;
      case "PLAYBACK":
        io.emit("playReqFromServer")
        break;
      case "CTRL":
        socket.join("ctrl")
        socket.emit('infoFromServer',clientsList)
        break;
    }
  })

  socket.on("chunkFromClient", (data) => {
      clientBuffer.push(data)
    console.log("chunk from:" + String(socket.id) + " " + String(clientBuffer.length))
  })
  i = 0
  socket.on("reqFromClient", (data) => {
    if(data === "CLIENT") {
      if(receiveBuffer.length > 0) {
        let bufferSlice = receiveBuffer.shift()
        socket.emit('chunkFromServer', bufferSlice)
        receiveBuffer.push(bufferSlice)
      } else {
        socket.emit('chunkFromServer', {"target": "NONE"})
      }
    } else if(data === "PARADE") {
      if(clientBuffer.length > i) {
        console.log(clientBuffer.length - i)
        i++
        let bufferSlice = clientBuffer.shift()
        console.log(Object.keys(bufferSlice))
        socket.emit('chunkFromServer', bufferSlice)
        clientBuffer.push(bufferSlice)
      } else {
        io.emit('endFromServer')
      }
      
    }
  })
 socket.on("endFromClient", () =>{
   console.log("owari")
 })
  socket.on("debugFromClient", (data) => {
    dt = new Date()
    fs.appendFile(logFilePath, dt.toFormat("YYYY/MM/DD HH24:MI:SS") + ',' + String(data.id) + ',' + String(data.freq) + 'Hz\n', (err) => {
      if(err) throw err;
    });
  })
});

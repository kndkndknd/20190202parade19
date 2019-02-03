const modules = require('./module.js');

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;

let audioContext 
let masterGain 
let javascriptnode
let osc
let oscGain
let streamBuffer = []
let lookBackBuffer = []
let loopBuffer = {}
let chatBuffer = {}
let bufferSize = 8192;
let bufferRate = 96000;
let chatGain
let initHsh = {}
let freqVal = 440
let tradeFlag =false

//let originalCoodinate = {x:0,y:0}
let message = { //later
  explain:{
    init: "準備します。少々お待ち下さい",
    next: "演奏を始めます。米子くんは画面をタップして立っていた場所を次の人に譲ってください。それ以外の人は米子くんの立っていた場所に順番に同じよう立ってからタップして次の人に場所を譲ってください",
    recordReady: "記録をとります。その場から好きなほうにカメラを向けて、画面をタップしてください",
    recording: "記録中",
    recordEnd: "記録が終わりました",
    playReady: "みなさんの記録を見ましょう",
    playEnd: "記録は以上です",
    end: "終わりです。ありがとうございました"
  },
  err:{
    getUserMedia:"カメラ、マイクが機能しないようです。それ以外の機能で演奏に参加してください。再度画面をタップすると音が出ます",
    gps:"GPSが機能しないようです。ブラウザを閉じてもらって、ほかのひとの音を聴いてください",
    recordErr:"ちょっと待ってください"
  }
} //later

//let timelapseFlag = false;
//video record/play ここから
let image;
let receive;
let receive_ctx;
// 関数
// canvas

let canvas = document.getElementById('cnvs');
let ctx = canvas.getContext('2d');
let strCnvs = document.getElementById('strCnvs');
let stx = strCnvs.getContext('2d');
let buffer;
let bufferContext;

const recordEmit = () =>{
  videoMode.mode = "record"
  modules.erasePrint(stx, strCnvs)
  modules.textPrint(stx, strCnvs, message.explain.recording)
  setTimeout(()=>{
    videoMode.mode = "none"
    modules.erasePrint(stx, strCnvs)
    modules.textPrint(stx, strCnvs, message.explain.recordEnd)
    socket.emit("readyFromClient", "recordEnd")  //later to app.js
    document.getElementById("video").style.display="none";
    video.muted = true
    //video.muted = "muted"
  },2000)
}

//canvas
const sizing=() =>{
  document.getElementById("cnvs").setAttribute("height", String(window.innerHeight) + "px")
  document.getElementById("cnvs").setAttribute("width", String(window.innerWidth) + "px")
  document.getElementById("strCnvs").setAttribute("height", String(window.innerHeight) + "px")
  document.getElementById("strCnvs").setAttribute("width", String(window.innerWidth) + "px")
}

sizing();

const renderStart=()=> {
  video = document.getElementById('video');
  buffer = document.createElement('canvas');
  bufferContext = buffer.getContext('2d');

  let render = () => {
    requestAnimationFrame(render);
    let width = video.videoWidth;
    let height = video.videoHeight;
    if(width == 0 || height ==0) {return;}
    buffer.width = width;
    buffer.height = height;
    bufferContext.drawImage(video, 0, 0);
  }
  render();
}

// socket
//socket.emit('connectFromClient', client);

socket.on('instructionFromServer', (data) => {
  modules.erasePrint(stx,strCnvs)
  modules.textPrint(stx,strCnvs,String(data))
})

socket.on("targetSendFromServer", (data) => {
  initHsh.target = data.target
  tradeFlag = !tradeFlag
})

socket.on('freqFromClient',(data) =>{
  originalCoodinate = data.coodinate
  osc.frequency.setValueAtTime(data.freq, 0);
})

socket.on('freqFromServer',(data) =>{
  let currentTime = audioContext.currentTime;
  osc.frequency.setTargetAtTime(data,currentTime,500);
  console.log(data)
})

socket.on('recReqFromServer',()=>{
  if(initHsh.getUserMedia) {
    videoMode.mode = "wait"
    video.muted = false
    document.getElementById("video").style.display="block";
    
    modules.erasePrint(stx,strCnvs)
    modules.textPrint(stx, strCnvs, message.explain.recordReady)
  } else {
    modules.erasePrint(stx,strCnvs)
    modules.textPrint(stx, strCnvs, message.err.recordErr)
  }
})

socket.on('playReqFromServer', () => {
  modules.erasePrint(stx,strCnvs)
  modules.textPrint(stx, strCnvs, message.explain.playReady)
  setTimeout(()=>{
    socket.emit('reqFromClient',"PARADE")
    modules.erasePrint(stx,strCnvs)
  },1000 + (Math.random() * 1000))
})
/*
socket.on('connectFromServer', (data) => {
  rhythmProperty = data.rhythm
})
socket.on('stringsFromServer', (data) =>{
  //modules.erasePrint(stx, strCnvs)
  stx.clearRect(0, 0, strCnvs.width, strCnvs.height);
  stringsClient = data
  modules.textPrint(stx,strCnvs, stringsClient)
});
socket.on('erasePrintFromServer',() =>{
  //stx.clearRect(0, 0, strCnvs.width, strCnvs.height);
  modules.erasePrint(stx,strCnvs)
  modules.whitePrint(ctx,canvas)
});

socket.on('statusViewFromServer', ()=>{
  let statusText = modules.statusPrint(oscGain.gain.value, freqVal, feedbackGain.gain.value, noiseGain.gain.value, bassFlag);
  strings = "";
  stringsClient = "";
  modules.erasePrint(stx, strCnvs);
  modules.textPrint(stx, strCnvs, statusText);
  setTimeout(()=>{
    modules.erasePrint(stx, strCnvs);
  },500)
});

socket.on('statusFromServer', (data)=>{
  if(videoMode.option === "loop"){
    playsampleRate = Number(data.sampleRate[playTarget])
  } else if(videoMode.mode === "pastPlay") {
    bufferRate = Number(data.sampleRate.SECBEFORE)
  }
})

socket.on('cmdFromServer', (data) => {
  if(standAlone === false){
    if(data.target === undefined || data.target === String(socket.id)){
      doCmd(data);
    } else {
      modules.erasePrint(stx, strCnvs);
      modules.textPrint(stx, strCnvs, data.cmd);
      setTimeout(() =>{
        modules.erasePrint(stx, strCnvs);
      },1000)
    }
  }
});
socket.on('textFromServer', (data) => {
  if(data.alert) {
    const previousStatus = {masterGain: masterGain.gain.value, videoMode: videoMode.mode, videoOption: videoMode.option}
    masterGain.gain.setValueAtTime(0,0)
    videoStop()
    setTimeout(()=>{
      alertPlay()
    },100)
    setTimeout(() => {
      masterGain.gain.setValueAtTime(previousStatus.masterGain,0)
      videoMode.mode = previousStatus.videoMode
      videoMode.option = previousStatus.videoOption
    }, 10000)
  }
  console.log("textFromServer")
  console.log(data.text)
  //modules.erasePrint(stx, strCnvs);
  //modules.textPrint(stx, strCnvs, data.text);
  modules.erasePrint(stx, strCnvs)
  modules.textPrint(stx,strCnvs, data.text)
  speakVoice(data.text)
  stringsClient = "";
});
*/
/*
socket.on('instructionFromServer', (data) => {
  videoStop();
  modules.erasePrint(stx, strCnvs);
  modules.textPrint(stx, strCnvs, data["text"]);
  //alertPlay();
  speakVoice(data)
  cmdMode.instruction = true
  setTimeout(()=>{
    modules.erasePrint(stx, strCnvs);
    cmdMode.instruction = false
  }, data["duration"]);
});
*/
/*

socket.on('streamListFromServer', (data) =>{
  streamList = data;
});
socket.on('streamReqFromServer', (data) => {
  switch(data){
    case "CHAT":
    case "droneChat":
      if(chatBuffer!= {} && videoMode.option != "loop") socket.emit('chunkFromClient', chatBuffer);
    break;
  }
});
*/

let playsampleRate = 96000
let playTarget = ""
socket.on('chunkFromServer', (data) => {
  if(videoMode.mode != "record"){
    if(data.target === "CHAT"){
      modules.erasePrint(stx, strCnvs);
      playAudioStream(data.audio,playsampleRate,1,false)
      playVideo(data.video);
    } else if(data.target === "NONE") {
      modules.erasePrint(stx, strCnvs);
      modules.textPrint(stx, strCnvs, "まだ演奏していません");
    } else if(data.target === "PARADE") {
      modules.erasePrint(stx, strCnvs);
      //playAudioStream(data.audio,playsampleRate,1,false)
      if(data.video != "data:,"){
        playVideo(data.video);
      }
      if(data.freq != undefined){
        let currentTime = audioContext.currentTime;
        osc.frequency.setValueAtTime(data.freq, 0);
      }
    }
    socket.emit('reqFromClient', "PARADE")
  }
});

socket.on('endFromServer', () =>{
  //modules.erasePrint(ctx,canvas)
  setTimeout(()=>{
    modules.textPrint(stx, strCnvs, message.explain.playEnd);
    modules.erasePrint(ctx,canvas)
  },500)
  setTimeout(()=>{
    let currentTime = audioContext.currentTime;
    oscGain.gain.setTargetAtTime(0,currentTime,6);
  },10000)

  setTimeout(() =>{
    modules.erasePrint(ctx,canvas)
    modules.erasePrint(stx,strCnvs)
    modules.textPrint(stx, strCnvs, message.explain.end);
    socket.emit('endFromClient')
  },15000)
})

const videoStop = () => {
  switch (videoMode.mode) {
    case "chunkEmit":
      break;
    case "beforePlay":
    case "beforeBuff":
    default:
      videoMode.mode = "none";
      break;
  }
  videoMode.option = "none"
}


const playVideo = (video) => {
  image = new Image();
  image.src = video;
  let wdth = window.innerWidth
  let hght = (wdth * 3) / 4

  image.onload = function(){
  let aspect = image.width / image.height
  if(aspect > (window.innerWidth / window.innerHeight)) {
      wdth = window.innerWidth
      hght = wdth / aspect
    } else {
        hght = window.innerHeight
        wdth = hght * aspect
    }
  //console.log("width:" + String(wdth) + ",height:" + String(hght) + ", x:"+ x + ", y:"+ y)
  receive_ctx.drawImage(image, 0, 0, wdth, hght);
  }
}
/*
const lapseInterval = 120000;
let setLapse;

const timeLapse = ()=>{
  setLapse = setInterval(() => {
      timelapseFlag = true;
  }, lapseInterval);
}

const stopLapse = ()=>{
  clearInterval(setLapse);
}
*/
const funcToBase64 = (buffer, video) =>{
  let bufferContext = buffer.getContext('2d');
  modules.textPrint(stx,strCnvs,Object.keys(video).join(","))
  buffer.width = video.videoWidth;
  buffer.height = video.videoHeight;
  bufferContext.drawImage(video, 0, 0);
  return buffer.toDataURL("image/png");
}

const onAudioProcess = (e) => {
    if(videoMode.mode === "record"){
      /*
      let bufferData = new Float32Array(bufferSize);
      if(e.inputBuffer.copyFromChannel != undefined){
        e.inputBuffer.copyFromChannel(bufferData, 0);
      } else {
        let input = e.inputBuffer.getChannelData(0);
        for (let i=0; i<bufferSize; i++ ){
          bufferData[i] = input[i];
        }
      }
      socket.emit('chunkFromClient', {"audio":bufferData, "video":funcToBase64(buffer, video), "target": "PARADE", "freq": freqVal})
      */
      socket.emit('chunkFromClient', {"audio":"", "video":funcToBase64(buffer, video), "target": "PARADE", "freq": freqVal})
    }
}
const playAudioStream = (flo32arr, sampleRate, volume, glitch) => {
    let audio_src = audioContext.createBufferSource();
    if(!glitch){
      let audio_buf = audioContext.createBuffer(1, bufferSize, sampleRate)
      if(audio_buf.copyToChannel != undefined) {
        let audioData = new Float32Array(bufferSize);
        for(let i = 0; i < audioData.length; i++){
          audioData[i] = flo32arr[i] * volume;
        }
        audio_buf.copyToChannel(audioData, 0);
      } else {
        let audioData = audio_buf.getChannelData(0)
        for(let i = 0; i < audioData.length; i++){
          audioData[i] = flo32arr[i] * volume;
        }
      }
      audio_src.buffer = audio_buf;
      audio_src.connect(masterGain);
    } else {
      let audio_buf = audioContext.createBuffer(1, bufferSize, convolver.context.sampleRate)
      //if(copyToChannel in audio_buf) {
      if(audio_buf.copyToChannel != undefined) {
        let audioData = new Float32Array(bufferSize);
        for(let i = 0; i < audioData.length; i++){
          audioData[i] = flo32arr[i] * volume;
        }
        audio_buf.copyToChannel(audioData, 0);
      } else {
        let audioData = audio_buf.getChannelData(0)
        for(let i = 0; i < audioData.length; i++){
          audioData[i] = flo32arr[i] * volume;
        }
      }
      audio_src.buffer = audio_buf;
      convolver.buffer = audio_buf;
      audio_src.connect(convolver);
    }
    //let timeOut = audio_src.buffer.duration * 1000;
    audio_src.start(0);
}
//video record/play ここまで

//let micLevel = 0.5
//
let mediaDevices = navigator.mediaDevices || ((navigator.mozGetUserMedia || navigator.webkitGetUserMedia || navigator.msGetUserMedia) ? {
    getUserMedia(c) {
        return new Promise(((y, n) => {
            (navigator.mozGetUserMedia || navigator.webkitGetUserMedia).call(navigator, c, y, n);
        }));
    }
} : null);

let initFlag = 0

let gps;
const getGPS = () =>{
  gps = setInterval(()=>{
    navigator.geolocation.getCurrentPosition((position)=>{
      let currentTime = audioContext.currentTime;
      if(initHsh.originX != undefined && initHsh.originY != undefined) {
        freqVal = 440 + 10 * (((position.coords.longitude - initHsh.originX) / 0.00010966404715491394 ) ** 2 + ((position.coords.latitude - initHsh.originY) / 0.000090133729745762 ) ** 2)
      }
      if(!tradeFlag) {
        let currentTime = audioContext.currentTime;
        osc.frequency.setTargetAtTime(freqVal,currentTime,500);
        /*
        socket.emit('debugFromClient', {
          id:String(socket.id),
          freq:freqVal
        }) //debug
        */
      } else {
        if(initHsh.target != undefined){
          socket.emit('freqFromClient',{
            freq: freqVal,
            target: initHsh.target
          })
        }
      }
    })
  },500)
}
const stopGPS = () => {
  clearInterval(gps);
}
/*
const emitGPS = () => {
  gps = setInterval(()=>{
    //later
      navigator.geolocation.getCurrentPosition((position)=>{
        if(initHsh.originX != undefined && initHsh.originY != undefined) {
          freqVal = 440 + ((position.coords.longitude - initHsh.originX) / 0.00010966404715491394 ) + ((position.coords.latitude - initHsh.originY) / 0.000090133729745762 )
        }
        if(initHsh.target != undefined){
          socket.emit('freqFromClient',{
            freq: freqVal,
            target: initHsh.target
          })
        }
      })
  },500)
}
*/

const initialize = () =>{
  if(initFlag === 0) { 
    initFlag++
    audioContext = new AudioContext();
    masterGain = audioContext.createGain();

    masterGain.gain.setValueAtTime(1,0)
    masterGain.connect(audioContext.destination);

    //osc(sinewave)
    osc = audioContext.createOscillator();
    oscGain = audioContext.createGain();
    osc.connect(oscGain);
    osc.frequency.setValueAtTime(freqVal, 0);
    oscGain.gain.setValueAtTime(0,0);
    oscGain.connect(masterGain);
    osc.start(0);


  //record/play
    javascriptnode = audioContext.createScriptProcessor(8192, 1, 1);

    // chat
    chatGain = audioContext.createGain();
    video = document.getElementById('video');
    video.muted = true
    buffer = document.createElement('canvas');
    bufferContext = buffer.getContext('2d');
    chatGain.gain.setValueAtTime(1,0);
    chatGain.connect(masterGain);
    console.log(navigator.mediaDevices.getSupportedConstraints())
    if(navigator.mediaDevices.getUserMedia){
    //  navigator.mediaDevices.getUserMedia({
      mediaDevices.getUserMedia({
        video: { facingMode: { exact: "environment" } }, audio: true
      }).then((stream) =>{
        let mediastreamsource = void 0;
        mediastreamsource = audioContext.createMediaStreamSource(stream);
        mediastreamsource.connect(javascriptnode);
        //video
        video = document.getElementById('video');
        video.srcObject = stream
        /*if(video.srcObject != undefined){
          video.srcObject = stream
        } else {
          video.src = window.URL.createObjectURL(stream);
        }*/
        video.play();
        video.volume = 0;
        renderStart();
        initHsh.getUserMedia = true
        socket.emit('initFromClient',initHsh)
        modules.erasePrint(stx,strCnvs)
        modules.textPrint(stx,strCnvs,message.explain.next)//rlater textPrint
      },  (e) =>{
        mediaDevices.getUserMedia({
          video: true, audio: true
        }).then((stream) =>{
          let mediastreamsource = void 0;
          mediastreamsource = audioContext.createMediaStreamSource(stream);
          mediastreamsource.connect(javascriptnode);
          //video
          video = document.getElementById('video');
          video.srcObject = stream
          /*if(video.srcObject != undefined){
            video.srcObject = stream
          } else {
            video.src = window.URL.createObjectURL(stream);
          }*/
          video.play();
          video.volume = 0;
          renderStart();
          initHsh.getUserMedia = true
          socket.emit('initFromClient',initHsh)
          modules.erasePrint(stx,strCnvs)
          modules.textPrint(stx,strCnvs,message.explain.next)//rlater textPrint
        }, (e) =>{
          initHsh.getUserMedia = false
          modules.erasePrint(stx,strCnvs)
          modules.textPrint(stx,strCnvs,message.err.getUserMedia)
          socket.emit('initFromClient',initHsh)
          return console.log(e);
        })
        return console.log(e);
      });
    } else {
      navigator.getUserMedia({
        video: { facingMode: { exact: "environment" } }, audio: true
        //video: true, audio: true
      }, (stream) =>{
        let mediastreamsource = void 0;
        mediastreamsource = audioContext.createMediaStreamSource(stream);
        mediastreamsource.connect(javascriptnode);
        //video
        video = document.getElementById('video');
        //video.src = window.URL.createObjectURL(stream);
        video.srcObject = stream
        /*
        if(video.srcObject != undefined){
          video.srcObject = stream
        } else {
          video.src = window.URL.createObjectURL(stream);
        }*/
        video.play();
        video.volume = 0;
        renderStart();
        initHsh.getUserMedia = true
        socket.emit('initFromClient',initHsh)
        modules.erasePrint(stx,strCnvs)
        modules.textPrint(stx,strCnvs,message.explain.next)//rlater textPrint
      },  (e) =>{
        modules.erasePrint(stx,strCnvs)
        modules.textPrint(stx,strCnvs,message.err.getUserMedia)//rlater textPrint
        initHsh.getUserMedia = false
        socket.emit('initFromClient',initHsh)
        return console.log(e);
      });
    }
    //rec
    javascriptnode.onaudioprocess = onAudioProcess;
    // javascriptnode.connect(audioContext.destination);
    javascriptnode.connect(masterGain);
    //video
    image = document.createElement("img");
    receive = document.getElementById("cnvs");
    receive_ctx = receive.getContext("2d");
    let timelapseFlag = true
    modules.erasePrint(stx,strCnvs)
    if(navigator.geolocation){

      navigator.geolocation.getCurrentPosition((position)=>{
        modules.erasePrint(stx,strCnvs)
        modules.textPrint(stx,strCnvs,message.explain.next)
        initHsh = {
          originX:position.coords.longitude,
          originY:position.coords.latitude
        }
        console.log(position.coords.longitude)
        socket.emit('initFromClient',initHsh)
      })
    } else {
      modules.erasePrint(stx,strCnvs)
      modules.textPrint(stx,strCnvs,message.err.gps)
    }
  } else if(initFlag === 1){
    initFlag++
    let currentTime = audioContext.currentTime;
    oscGain.gain.setTargetAtTime(1,currentTime,3);
    modules.erasePrint(stx,strCnvs)
    getGPS()
  } else if(initFlag > 1 && videoMode.mode === "wait") {
    modules.erasePrint(stx,strCnvs)
    recordEmit()
  }
};

//document.getElementById("wrapper").onclick = function() {
//  initialize
//}
let eListener = document.getElementById("wrapper")
eListener.addEventListener("click", initialize, false);
//window.addEventListener("load", initialize, false);
window.addEventListener('resize', (e) =>{
  console.log('resizing')
  sizing()
})
console.log("text")
modules.textPrint(stx,strCnvs,message.explain.init)


const { app, BrowserWindow } = require('electron');
let win        = null;

app.on('ready', ()=>{
    win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true
        }
    });
    //index boots the boid script
    //boid.js has the logic implemented originally by aadebdeb https://www.openprocessing.org/user/51764
    //some adjustments have been made and all vectors now use the p5 implementation
    win.loadURL('file://' + __dirname + '/index.html');

});
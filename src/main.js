const electron = require('electron')
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow

const path = require('path')
const url = require('url')
const process = require('process')

const Config = require('electron-config')
const config = new Config()
const { ipcMain, ipcRenderer } = require('electron')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow, winWidth = 400, winHeight = 300,
  prayers = config.get('prayers'), resetDate = config.get('last-reset-date'),
  notifications = config.get('notifications'), keepOnTop = config.get('keep-on-top'), sentItems = {}

const createWindow = () => {
  prayers = prayers === undefined ? prayers : 0;
  notifications = notifications ? notifications : false;
  resetDate = resetDate === undefined ? new Date() : resetDate;
  mainWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    minWidth: 300,
    minHeight: 200,
    frame: false,
    transparent: true,
    alwaysOnTop: keepOnTop
  })
  mainWindow.setResizable(false);
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }));
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

app.on('ready', () => {
  if (process.env.ELECTRON_ENABLE_LOGGING) {
    // Set ReactDevTools location based on OS
    let extension_path = ''
    if (process.platform === 'darwin') {
      extension_path = path.join('/Users', 'acjanus', 'Library', 'Application Support',
        'Google', 'Chrome', 'Default', 'Extensions', 'fmkadmapgofadopljbjfkapdkoienihi',
        '2.5.0_0')
    } else {
      extension_path = path.join('C:', 'Users', 'Antoinette', 'AppData',
        'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Extensions',
        'fmkadmapgofadopljbjfkapdkoienihi', '2.5.0_0')
    }
    BrowserWindow.addDevToolsExtension(
      extension_path
    )
  }

  setInterval(() => {
    checkIfMidnight()
  }, 1000)
  createWindow()
})

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

const checkIfMidnight = () => {
  const currentdate = new Date()
  const offsetHrs = currentdate.getTimezoneOffset() / 60
  let hours = currentdate.getUTCHours() - offsetHrs
  if (hours >= 24) { hours -= 24; }
  if (hours < 0) { hours += 12; }
  const mins = currentdate.getMinutes()
  const secs = currentdate.getSeconds()
  const _this = this;
  if (hours === 0 && mins === 0 && secs >= 0 && secs <= 1) {
    ipcRenderer.send('reset-prayers', '')
  }
}

// Reset all tasks on click to incomplete
ipcMain.on('reset-prayers', (event, args) => {
  config.set('prayers', 0);
  resetDate = new Date();
  config.set('last-reset-date', resetDate)
  sentItems = {
    prayers: config.get('prayers'),
    resetDate: resetDate,
    keepOnTop: keepOnTop
  }
  event.sender.send('reset', sentItems)
})

ipcMain.on('get-prayers', (event, args) => {
  sentItems = {
    prayers: prayers,
    resetDate: resetDate,
    keepOnTop: keepOnTop
  }
  event.sender.send('send-items', sentItems)
})

ipcMain.on('add-cup', (event, args) => {
  sentItems.prayers = sentItems.prayers + 1
  config.set('prayers', sentItems.prayers)
  event.sender.send('send-items', sentItems)
})

ipcMain.on('subtract-cup', (event, args) => {
  sentItems.prayers = sentItems.prayers - 1
  config.set('prayers', sentItems.prayers)
  event.sender.send('send-items', sentItems)
})

//track and alert prayers

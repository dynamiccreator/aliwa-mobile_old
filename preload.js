const {ipcRenderer, contextBridge} = require("electron");


contextBridge.exposeInMainWorld("electron", {
    ipcRenderer_invoke: (channel, ...params) => ipcRenderer.invoke(channel, ...params),
    ipcRenderer_on: (channel,...params) => ipcRenderer.on(channel, (event, ...params) => {})
}); 
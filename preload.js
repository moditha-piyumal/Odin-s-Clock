const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("windowControls", {
	minimize: () => ipcRenderer.send("window:minimize"),
	close: () => ipcRenderer.send("window:close"),

	expand: () => ipcRenderer.send("window:expand"),

	onCollapsed: (callback) => ipcRenderer.on("window:collapsed", callback),
});

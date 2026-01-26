const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("windowControls", {
	minimize: () => ipcRenderer.send("window:minimize"),
	close: () => ipcRenderer.send("window:close"),

	expand: () => ipcRenderer.send("window:expand"),
	openScheduleModal: () => ipcRenderer.send("window:open-schedule-modal"),

	onCollapsed: (callback) => ipcRenderer.on("window:collapsed", callback),
});

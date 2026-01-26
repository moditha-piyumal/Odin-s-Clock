const { app, BrowserWindow, ipcMain, screen } = require("electron");

function createWindow() {
	const displays = screen.getAllDisplays();

	const targetDisplay =
		displays.find((d) => d.rotation === 90) || screen.getPrimaryDisplay();

	const { x, y, width, height } = targetDisplay.workArea;

	const WINDOW_WIDTH = 500;
	const WINDOW_HEIGHT = 800;

	// Negative offset to compensate for shadow thickness
	const SHADOW_OFFSET = 12;

	const win = new BrowserWindow({
		width: WINDOW_WIDTH,
		height: WINDOW_HEIGHT,

		x: x + width - WINDOW_WIDTH + SHADOW_OFFSET,
		y: y + height - WINDOW_HEIGHT + SHADOW_OFFSET,

		frame: false,
		transparent: true,
		backgroundColor: "#00000000",

		resizable: true,
		maximizable: true,
		minimizable: true,
		hasShadow: true, // ❤️ keep it

		webPreferences: {
			preload: __dirname + "/preload.js",
		},
	});

	win.loadFile("index.html");
}

ipcMain.on("window:minimize", () => {
	BrowserWindow.getFocusedWindow()?.minimize();
});

ipcMain.on("window:maximize", () => {
	const win = BrowserWindow.getFocusedWindow();
	if (!win) return;

	win.isMaximized() ? win.unmaximize() : win.maximize();
});

ipcMain.on("window:close", () => {
	BrowserWindow.getFocusedWindow()?.close();
});

app.whenReady().then(createWindow);

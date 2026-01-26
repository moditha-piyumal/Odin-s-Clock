const { app, BrowserWindow, ipcMain, screen } = require("electron");
const fs = require("fs");
const path = require("path");

let win = null;

let tasksCache = [];
let tasksFilePath;

// ===============================
// 🧱 WINDOW SIZE CONSTANTS
// ===============================
const WINDOW_WIDTH = 440;
const COLLAPSED_HEIGHT = 180;
const EXPANDED_HEIGHT = 920;

// Shadow compensation (keeps visual edge tight)
const SHADOW_OFFSET = 12;

// ===============================
// 🪟 CREATE WINDOW
// ===============================
function createWindow() {
	const userDataPath = app.getPath("userData");
	tasksFilePath = path.join(userDataPath, "scheduled_tasks.json");

	// Create file if it doesn't exist
	if (!fs.existsSync(tasksFilePath)) {
		fs.writeFileSync(tasksFilePath, JSON.stringify([], null, 2));
	}

	// Load once into memory
	try {
		const raw = fs.readFileSync(tasksFilePath, "utf-8");
		tasksCache = JSON.parse(raw);
	} catch (err) {
		console.error("Failed to load scheduled tasks:", err);
		tasksCache = [];
	}

	const displays = screen.getAllDisplays();

	// Prefer vertical monitor, fallback to primary
	const targetDisplay =
		displays.find((d) => d.rotation === 90) || screen.getPrimaryDisplay();

	const { x, y, width, height } = targetDisplay.workArea;

	// Bottom-right position (collapsed)
	const collapsedBounds = {
		width: WINDOW_WIDTH,
		height: COLLAPSED_HEIGHT,
		x: x + width - WINDOW_WIDTH + SHADOW_OFFSET,
		y: y + height - COLLAPSED_HEIGHT + SHADOW_OFFSET,
	};

	win = new BrowserWindow({
		...collapsedBounds,

		frame: false,
		transparent: true,
		backgroundColor: "#00000000",

		resizable: true,
		maximizable: false,
		minimizable: true,
		hasShadow: true,

		webPreferences: {
			preload: __dirname + "/preload.js",
		},
	});

	win.loadFile("index.html");

	// ===============================
	// 🔽 COLLAPSE ON BLUR
	// ===============================
	win.on("blur", () => {
		collapseWindow();
	});
}

// ===============================
// 🔼 EXPAND / COLLAPSE LOGIC
// ===============================
function expandWindow() {
	if (!win) return;

	const { x, y, width, height } = win.getBounds();

	win.setBounds({
		width: WINDOW_WIDTH,
		height: EXPANDED_HEIGHT,
		x,
		// Expand upward: move Y up by height difference
		y: y - (EXPANDED_HEIGHT - height),
	});
}

function collapseWindow() {
	if (!win) return;

	const { x, y, height } = win.getBounds();

	win.setBounds({
		width: WINDOW_WIDTH,
		height: COLLAPSED_HEIGHT,
		x,
		y: y + (height - COLLAPSED_HEIGHT),
	});

	// 🔔 notify renderer
	win.webContents.send("window:collapsed");
}

// ===============================
// 📡 IPC EVENTS
// ===============================
ipcMain.on("window:minimize", () => {
	win?.minimize();
});

ipcMain.on("window:close", () => {
	win?.close();
});

ipcMain.on("window:expand", () => {
	expandWindow();
});

ipcMain.on("window:collapse", () => {
	collapseWindow();
});

// ===============================
// 🚀 APP LIFECYCLE
// ===============================
app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

function saveTasksToDisk() {
	try {
		fs.writeFileSync(tasksFilePath, JSON.stringify(tasksCache, null, 2));
	} catch (err) {
		console.error("Failed to save scheduled tasks:", err);
	}
}

const { app, BrowserWindow, ipcMain, screen } = require("electron");
const fs = require("fs");
const path = require("path");

let win = null;

let tasksCache = [];
let tasksFilePath;

// 🔒 Pomodoro expansion lock
let POMODORO_LOCK_EXPANDED = false;

// ===============================
// 🧱 WINDOW SIZE CONSTANTS
// ===============================
const WINDOW_WIDTH = 440;
const COLLAPSED_HEIGHT = 180;
const EXPANDED_HEIGHT = 950;

// Shadow compensation (keeps visual edge tight)
const SHADOW_OFFSET = 12;

const DEV_DISABLE_AUTO_COLLAPSE = false; // DEV MODE: set to true to disable auto-collapse on blur

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
		// This part is not absolutely needed
		// ✅ Migration: ensure daily tasks have doneDates map
		tasksCache = (tasksCache || []).map((t) => {
			if (t?.type !== "daily") return t;

			// Create doneDates if missing
			if (!t.doneDates) t.doneDates = {};

			// If old data used lastDoneDate, migrate it into doneDates
			if (t.lastDoneDate && !t.doneDates[t.lastDoneDate]) {
				t.doneDates[t.lastDoneDate] = true;
			}

			return t;
		});

		// Persist migration so it doesn't repeat every launch
		saveTasksToDisk();

		// but it ensures any malformed data doesn't break the app
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
		icon: path.join(__dirname, "assets/icon.ico"),
	});

	win.loadFile("index.html");

	// ===============================
	// 🔽 COLLAPSE ON BLUR
	// ===============================
	win.on("blur", () => {
		if (DEV_DISABLE_AUTO_COLLAPSE) return; // DEV MODE
		if (POMODORO_LOCK_EXPANDED) return; // 🍅 Pomodoro lock
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

// 🍅 Pomodoro expansion lock
ipcMain.on("pomodoro:lock", () => {
	POMODORO_LOCK_EXPANDED = true;
	expandWindow(); // ensure visible
});

ipcMain.on("pomodoro:unlock", () => {
	POMODORO_LOCK_EXPANDED = false;
});

// ================================
// 📡 STEP 6: SCHEDULE IPC
// ================================

ipcMain.handle("scheduledTasks:load", () => {
	return tasksCache;
});

ipcMain.handle("scheduledTasks:add", (event, task) => {
	tasksCache.push(task);
	saveTasksToDisk();
	return tasksCache;
});

ipcMain.handle("scheduledTasks:markDone", (event, taskId, meta = {}) => {
	const task = tasksCache.find((t) => t.id === taskId);
	if (!task) return tasksCache;

	if (task.type === "oneTime") {
		task.done = true;
		task.doneAt = new Date().toISOString();
	}

	if (task.type === "daily") {
		const dateKey = meta.date; // expects "YYYY-MM-DD"
		if (!task.doneDates) task.doneDates = {};

		if (dateKey) {
			task.doneDates[dateKey] = true; // ✅ supports multiple done days
			task.lastDoneDate = dateKey; // optional: keep "latest"
			task.lastDoneAt = new Date().toISOString();
		}
	}

	saveTasksToDisk();
	return tasksCache;
});

ipcMain.handle("scheduledTasks:markDeleted", (event, taskId) => {
	const task = tasksCache.find((t) => t.id === taskId);
	if (!task) return tasksCache;

	task.deleted = true;
	task.deletedAt = new Date().toISOString();

	saveTasksToDisk();
	return tasksCache;
});

// ================================
// 📡 INTERMITTENT FASTING IPC
// ================================

const fastingFilePath = path.join(app.getPath("userData"), "fasting.json");

ipcMain.handle("fasting:load", () => {
	try {
		if (!fs.existsSync(fastingFilePath)) return null;
		const raw = fs.readFileSync(fastingFilePath, "utf-8");
		return JSON.parse(raw);
	} catch (err) {
		console.error("Failed to load fasting state:", err);
		return null;
	}
});

ipcMain.handle("fasting:save", (event, data) => {
	try {
		fs.writeFileSync(fastingFilePath, JSON.stringify(data, null, 2));
		return true;
	} catch (err) {
		console.error("Failed to save fasting state:", err);
		return false;
	}
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

// const { ipcMain } = require("electron");

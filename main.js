const { app, BrowserWindow, ipcMain, screen } = require("electron");
const fs = require("fs");
const path = require("path");

let win = null;

let tasksCache = [];
let tasksFilePath;
let fastingState = {
	gapHours: null,
	lastMealTime: null,
};
let fastingFilePath;

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

const DEV_DISABLE_AUTO_COLLAPSE = true; // DEV MODE: set to true to disable auto-collapse on blur

// ===============================
// 🪟 CREATE WINDOW
// ===============================
function createWindow() {
	const userDataPath = app.getPath("userData");
	tasksFilePath = path.join(userDataPath, "scheduled_tasks.json");
	fastingFilePath = path.join(userDataPath, "fasting_state.json");

	// Create file if it doesn't exist
	if (!fs.existsSync(tasksFilePath)) {
		fs.writeFileSync(tasksFilePath, JSON.stringify([], null, 2));
	}

	if (!fs.existsSync(fastingFilePath)) {
		fs.writeFileSync(fastingFilePath, JSON.stringify(fastingState, null, 2));
	}

	// Load once into memory
	try {
		const raw = fs.readFileSync(tasksFilePath, "utf-8");
		tasksCache = JSON.parse(raw);
	} catch (err) {
		console.error("Failed to load scheduled tasks:", err);
		tasksCache = [];
	}

	try {
		const raw = fs.readFileSync(fastingFilePath, "utf-8");
		const parsed = JSON.parse(raw);
		if (parsed && typeof parsed === "object") {
			fastingState = {
				gapHours:
					Number.isFinite(parsed.gapHours) && parsed.gapHours > 0
						? parsed.gapHours
						: null,
				lastMealTime: parsed.lastMealTime ?? null,
			};
		}
	} catch (err) {
		console.error("Failed to load fasting state:", err);
		fastingState = { gapHours: null, lastMealTime: null };
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
		task.lastDoneDate = meta.date;
		task.lastDoneAt = new Date().toISOString();
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

ipcMain.handle("fasting:load", () => {
	return fastingState;
});

ipcMain.handle("fasting:save", (event, nextState) => {
	if (nextState && typeof nextState === "object") {
		fastingState = {
			...fastingState,
			...nextState,
		};
	}

	saveFastingStateToDisk();
	return fastingState;
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

function saveFastingStateToDisk() {
	try {
		fs.writeFileSync(fastingFilePath, JSON.stringify(fastingState, null, 2));
	} catch (err) {
		console.error("Failed to save fasting state:", err);
	}
}

// const { ipcMain } = require("electron");

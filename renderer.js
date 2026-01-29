let isExpanded = false;

const generateId = () =>
	crypto.randomUUID?.() || Math.random().toString(36).slice(2);

// =============================
// 🍅 POMODORO STATE (STEP 1)
// =============================
// Represents Pomodoro timing/session data only; timers + UI wiring come later.
const pomodoroState = {
	phase: "idle",
	focusDurationSeconds: 25 * 60,
	breakDurationSeconds: 5 * 60,
	totalSessions: 4,
	currentSession: 0,
	remainingSeconds: 0,
	timerId: null,
};

const resetPomodoroState = () => {
	pomodoroState.phase = "idle";
	pomodoroState.focusDurationSeconds = 25 * 60;
	pomodoroState.breakDurationSeconds = 5 * 60;
	pomodoroState.totalSessions = 4;
	pomodoroState.currentSession = 0;
	pomodoroState.remainingSeconds = 0;
	pomodoroState.timerId = null;
};

const expandable = document.getElementById("expandable");
const clockElement = document.querySelector(".clock");
const nextTaskElement = document.querySelector(".next-task");
const dailyBtn = document.getElementById("dailyTaskBtn");
const oneTimeBtn = document.getElementById("oneTimeTaskBtn");
const dailyForm = document.getElementById("dailyTaskForm");
const oneTimeForm = document.getElementById("oneTimeTaskForm");

const dailyNameInput = document.getElementById("dailyTaskName");
const dailyTimeInput = document.getElementById("dailyTaskTime");
const dailyError = document.getElementById("dailyTaskError");

const oneNameInput = document.getElementById("oneTimeTaskName");
const oneDateInput = document.getElementById("oneTimeTaskDate");
const oneTimeInput = document.getElementById("oneTimeTaskTime");
const oneError = document.getElementById("oneTimeTaskError");

// 🍅 POMODORO CONFIG UI (STEP 2)
const pomodoroFocusInput = document.getElementById("pomodoroFocusMinutes");
const pomodoroBreakInput = document.getElementById("pomodoroBreakMinutes");
const pomodoroSessionsInput = document.getElementById("pomodoroSessions");
const startPomodoroBtn = document.getElementById("startPomodoroBtn");
// 🍅 POMODORO DONUT UI (STEP 3)
const pomodoroTimeDisplay = document.getElementById("pomodoroTimeDisplay");
const pomodoroPhaseLabel = document.getElementById("pomodoroPhaseLabel");
const pomodoroDonutRing = document.querySelector(".pomodoro-donut-ring");
const pomodoroCancelBtn = document.getElementById("pomodoroCancelBtn");
const pomodoroSessionDisplay = document.getElementById(
	"pomodoroSessionDisplay",
);
const pomodoroSessionCount =
	pomodoroSessionDisplay?.querySelector(".session-count") ?? null;

const updateSessionCounter = () => {
	if (!pomodoroSessionCount) return;
	pomodoroSessionCount.textContent = `${pomodoroState.currentSession} / ${pomodoroState.totalSessions}`;
};

const showSessionCounter = () => {
	if (!pomodoroSessionDisplay) return;
	pomodoroSessionDisplay.classList.remove("hidden");
};

const hideSessionCounter = () => {
	if (!pomodoroSessionDisplay) return;
	pomodoroSessionDisplay.classList.add("hidden");
};

if (pomodoroTimeDisplay) {
	pomodoroTimeDisplay.textContent = "25:00";
}

if (pomodoroPhaseLabel) {
	pomodoroPhaseLabel.textContent = "IDLE";
}

if (startPomodoroBtn) {
	startPomodoroBtn.addEventListener("click", () => {
		const focusMinutes = Number(pomodoroFocusInput?.value);
		const breakMinutes = Number(pomodoroBreakInput?.value);
		const totalSessions = Number(pomodoroSessionsInput?.value);

		pomodoroState.focusDurationSeconds =
			(Number.isFinite(focusMinutes) && focusMinutes > 0 ? focusMinutes : 25) *
			60;
		pomodoroState.breakDurationSeconds =
			(Number.isFinite(breakMinutes) && breakMinutes > 0 ? breakMinutes : 5) *
			60;
		pomodoroState.totalSessions =
			Number.isFinite(totalSessions) && totalSessions > 0 ? totalSessions : 4;

		// ✅ RESET SESSION COUNT HERE
		pomodoroState.currentSession = 1;
		window.windowControls.lockPomodoro();
		updateSessionCounter();
		showSessionCounter();

		// 🍅 POMODORO COUNTDOWN ENGINE (STEP 4)
		if (pomodoroState.timerId) {
			clearInterval(pomodoroState.timerId);
			pomodoroState.timerId = null;
		}

		pomodoroState.phase = "focus";
		pomodoroState.remainingSeconds = pomodoroState.focusDurationSeconds;

		const ringCircumference = 427;

		const startFocusPhase = () => {
			pomodoroState.phase = "focus";
			pomodoroState.remainingSeconds = pomodoroState.focusDurationSeconds;
		};

		const startBreakPhase = () => {
			pomodoroState.phase = "break";
			pomodoroState.remainingSeconds = pomodoroState.breakDurationSeconds;
		};

		const updatePomodoroDisplay = () => {
			// ✅ Convert remaining seconds into MM:SS
			const minutes = Math.floor(pomodoroState.remainingSeconds / 60);
			const seconds = pomodoroState.remainingSeconds % 60;
			const timeLabel = `${padTime(minutes)}:${padTime(seconds)}`;

			// ✅ Update the center time text
			if (pomodoroTimeDisplay) {
				pomodoroTimeDisplay.textContent = timeLabel;
			}

			// ✅ Update the phase label (FOCUS / BREAK / IDLE)
			if (pomodoroPhaseLabel) {
				pomodoroPhaseLabel.textContent = pomodoroState.phase.toUpperCase();
			}

			if (pomodoroDonutRing) {
				if (pomodoroState.phase === "focus") {
					pomodoroDonutRing.style.stroke = "rgba(255, 160, 60, 0.95)"; // forge orange
				} else if (pomodoroState.phase === "break") {
					pomodoroDonutRing.style.stroke = "rgba(255, 109, 90, 0.9)"; // calm blue
				} else {
					pomodoroDonutRing.style.stroke = "rgba(255, 160, 60, 0.4)";
				}
			}

			// ✅ Donut progress should depend on the current phase duration
			//    - Focus uses focusDurationSeconds
			//    - Break uses breakDurationSeconds
			let totalPhaseSeconds = pomodoroState.focusDurationSeconds;
			if (pomodoroState.phase === "break") {
				totalPhaseSeconds = pomodoroState.breakDurationSeconds;
			}

			// ✅ Avoid divide-by-zero (just in case)
			if (totalPhaseSeconds <= 0) totalPhaseSeconds = 1;

			// ✅ Progress ratio: 1.0 at start, 0.0 at end
			const ratio = pomodoroState.remainingSeconds / totalPhaseSeconds;

			// ✅ Convert ratio into strokeDashoffset
			if (pomodoroDonutRing) {
				const offset = ringCircumference * ratio;
				pomodoroDonutRing.style.strokeDashoffset = String(offset);
			}
		};

		updatePomodoroDisplay();

		// ✅ A named tick function (stable + debuggable)
		const tickPomodoro = () => {
			// Step down 1 second
			pomodoroState.remainingSeconds -= 1;

			// If time is over for the current phase...
			if (pomodoroState.remainingSeconds <= 0) {
				pomodoroState.remainingSeconds = 0;
				updatePomodoroDisplay();

				// 🔁 Phase switching (focus -> break -> focus ...)
				if (pomodoroState.phase === "focus") {
					// ✅ If we hit the session limit, stop entirely
					if (pomodoroState.currentSession >= pomodoroState.totalSessions) {
						clearInterval(pomodoroState.timerId);
						pomodoroState.timerId = null;
						const completedSessions = pomodoroState.currentSession;

						// Keep state simple: idle + DONE
						resetPomodoroState();
						window.windowControls.unlockPomodoro();

						if (pomodoroTimeDisplay) pomodoroTimeDisplay.textContent = "DONE";
						if (pomodoroPhaseLabel) pomodoroPhaseLabel.textContent = "IDLE";

						// ✅ Reset donut ring to full circle when idle
						if (pomodoroDonutRing)
							pomodoroDonutRing.style.strokeDashoffset = "0";

						// updateSessionCounter();
						// hideSessionCounter();
						if (pomodoroSessionCount) {
							pomodoroSessionCount.textContent = `${completedSessions} Complete`;
						}

						return;
					}

					// ✅ Move into break phase
					startBreakPhase();
					updatePomodoroDisplay();
					return; // timer keeps running, next tick continues break
				}

				if (pomodoroState.phase === "break") {
					// ✅ Otherwise, start the next focus phase
					pomodoroState.currentSession += 1;
					updateSessionCounter();
					startFocusPhase();
					updatePomodoroDisplay();
					return;
				}
			}

			// Normal tick render
			updatePomodoroDisplay();
		};

		// ✅ Start ticking
		pomodoroState.timerId = setInterval(tickPomodoro, 1000);

		console.log("Pomodoro config captured:", {
			focusMinutes,
			breakMinutes,
			totalSessions,
		});
	});
}

function cancelPomodoro() {
	// 1. Stop timer safely
	if (pomodoroState.timerId) {
		clearInterval(pomodoroState.timerId);
		pomodoroState.timerId = null;
	}

	// 2. Reset core state
	resetPomodoroState();

	// 3. Reset UI text
	if (pomodoroTimeDisplay) {
		const minutes = Math.floor(pomodoroState.focusDurationSeconds / 60);
		pomodoroTimeDisplay.textContent = `${padTime(minutes)}:00`;
	}

	if (pomodoroPhaseLabel) {
		pomodoroPhaseLabel.textContent = "IDLE";
	}

	// 4. Reset donut ring (full circle)
	if (pomodoroDonutRing) {
		pomodoroDonutRing.style.strokeDashoffset = "0";
	}

	// 5. Hide & reset session counter UI
	hideSessionCounter();

	// 6. Unlock window collapse
	window.windowControls?.unlockPomodoro?.();
}

// if (pomodoroCancelBtn) {
// 	pomodoroCancelBtn.addEventListener("click", () => {
// 		if (pomodoroState.timerId) {
// 			clearInterval(pomodoroState.timerId);
// 			pomodoroState.timerId = null;
// 		}

// 		resetPomodoroState();

// 		if (pomodoroTimeDisplay) {
// 			const minutes = Math.floor(pomodoroState.focusDurationSeconds / 60);
// 			const seconds = pomodoroState.focusDurationSeconds % 60;
// 			pomodoroTimeDisplay.textContent = `${padTime(minutes)}:${padTime(seconds)}`;
// 		}

// 		if (pomodoroPhaseLabel) {
// 			pomodoroPhaseLabel.textContent = "IDLE";
// 		}

// 		if (pomodoroDonutRing) {
// 			pomodoroDonutRing.style.strokeDashoffset = "0";
// 		}

// 		window.windowControls?.unlockPomodoro?.();
// 		hideSessionCounter();
// 	});
// }

if (pomodoroCancelBtn) {
	pomodoroCancelBtn.addEventListener("click", () => {
		cancelPomodoro();
	});
}

const padTime = (value) => String(value).padStart(2, "0");

//Today helper
// ✅ Local date helper (Sri Lanka / system local time)
const getTodayLocalISO = () => {
	const d = new Date();
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`; // YYYY-MM-DD (local)
};

const scheduledList = document.getElementById("scheduledTasksList");
let scheduledTasksCache = [];
const getNow = () => new Date();
const getNextDailyDateTime = (task) => {
	const now = getNow();

	const [hh, mm] = task.time.split(":").map(Number);
	const today = new Date(now);
	today.setHours(hh, mm, 0, 0);

	if (today > now) return today;

	const tomorrow = new Date(today);
	tomorrow.setDate(today.getDate() + 1);
	return tomorrow;
};

// Modal Helpers
const modalOverlay = document.getElementById("scheduleModalOverlay");
const closeModalBtn = document.getElementById("closeScheduleModal");
const addScheduledBtn = document.getElementById("addScheduledTaskBtn");

const closeModal = () => {
	modalOverlay.classList.add("hidden");
	dailyForm.classList.add("hidden");
	oneTimeForm.classList.add("hidden");

	dailyNameInput.value = "";
	dailyTimeInput.value = "";
	oneNameInput.value = "";
	oneDateInput.value = "";
	oneTimeInput.value = "";
};

addScheduledBtn.addEventListener("click", () => {
	modalOverlay.classList.remove("hidden");
});

closeModalBtn.addEventListener("click", closeModal);

// Clock rendering
const renderClock = () => {
	const now = new Date();
	const hours = padTime(now.getHours());
	const minutes = padTime(now.getMinutes());
	clockElement.textContent = `${hours}:${minutes}`;
};

// Tasks form toggling

dailyBtn.addEventListener("click", () => {
	dailyForm.classList.remove("hidden");
	oneTimeForm.classList.add("hidden");
});

oneTimeBtn.addEventListener("click", () => {
	oneTimeForm.classList.remove("hidden");
	dailyForm.classList.add("hidden");
});

// Tasks form validation
document
	.getElementById("saveDailyTaskBtn")
	.addEventListener("click", async () => {
		dailyError.classList.add("hidden");

		if (!dailyNameInput.value || !dailyTimeInput.value) {
			dailyError.textContent = "Please enter a task name and time.";
			dailyError.classList.remove("hidden");
			return;
		}

		const task = {
			id: generateId(),
			type: "daily",
			name: dailyNameInput.value.trim(),
			time: dailyTimeInput.value,
			createdAt: new Date().toISOString(),
			lastDoneDate: null,
		};

		await window.scheduledTasks.add(task);
		await loadAndRenderScheduledTasks();

		closeModal();
	});

document
	.getElementById("saveOneTimeTaskBtn")
	.addEventListener("click", async () => {
		oneError.classList.add("hidden");

		if (!oneNameInput.value || !oneDateInput.value || !oneTimeInput.value) {
			oneError.textContent = "Please fill all fields.";
			oneError.classList.remove("hidden");
			return;
		}

		const task = {
			id: generateId(),
			type: "oneTime",
			name: oneNameInput.value.trim(),
			date: oneDateInput.value,
			time: oneTimeInput.value,
			createdAt: new Date().toISOString(),
			done: false,
		};

		await window.scheduledTasks.add(task);
		await loadAndRenderScheduledTasks();

		closeModal();
	});

const scheduleClockUpdates = () => {
	renderClock();
	renderScheduledTasks(); // 👈 initial render sync

	const now = new Date();
	const msUntilNextMinute =
		(60 - now.getSeconds()) * 1000 - now.getMilliseconds();

	setTimeout(
		() => {
			renderClock();
			renderScheduledTasks(); // 👈 minute boundary sync

			setInterval(() => {
				renderClock();
				renderScheduledTasks(); // 👈 every minute
			}, 60_000);
		},
		Math.max(msUntilNextMinute, 0),
	);
};

const getScheduledItems = () => {
	const items = [];

	for (const task of scheduledTasksCache) {
		const now = getNow();
		if (task.deleted) continue; // 👈 add this line
		if (task.type === "oneTime") {
			if (task.done) continue;

			const dt = new Date(`${task.date}T${task.time}`);
			if (dt > now) {
				items.push({
					task,
					dateTime: dt,
					label: `${task.name} – ${task.date} ${task.time}`,
				});
			}
		}

		if (task.type === "daily") {
			// 🚫 Skip if already done today
			if (task.lastDoneDate === getTodayLocalISO()) {
				continue;
			}

			const nextDt = getNextDailyDateTime(task);

			items.push({
				task,
				dateTime: nextDt,
				label: `${task.name} – ${nextDt.toLocaleTimeString([], {
					hour: "2-digit",
					minute: "2-digit",
				})}`,
			});
		}
	}

	// Sort by time
	items.sort((a, b) => a.dateTime - b.dateTime);

	return items;
};

const renderNextTask = (items) => {
	if (!nextTaskElement) return;

	if (items.length === 0) {
		nextTaskElement.textContent = "Next (no tasks yet)";
		return;
	}

	const nextItem = items[0];
	const timeLabel = nextItem.dateTime.toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	});

	nextTaskElement.textContent = `Next: ${nextItem.task.name} at ${timeLabel}`;
};

const renderScheduledTasks = () => {
	scheduledList.innerHTML = "";

	const items = getScheduledItems();
	renderNextTask(items);

	if (items.length === 0) {
		scheduledList.innerHTML = `<div class="scheduled-empty">No scheduled tasks yet</div>`;
		return;
	}

	for (const item of items) {
		const el = document.createElement("div");
		el.className = "scheduled-item";

		const label = document.createElement("span");
		label.textContent = item.label;

		const doneBtn = document.createElement("button");
		doneBtn.textContent = "Done";
		doneBtn.className = "scheduled-done-btn";

		doneBtn.addEventListener("click", async () => {
			if (item.task.type === "daily") {
				await window.scheduledTasks.markDone(item.task.id, {
					date: getTodayLocalISO(),
				});
			}

			if (item.task.type === "oneTime") {
				await window.scheduledTasks.markDone(item.task.id);
			}

			await loadAndRenderScheduledTasks();
		});

		const deleteBtn = document.createElement("button");
		deleteBtn.textContent = "Delete";
		deleteBtn.className = "scheduled-delete-btn";

		deleteBtn.addEventListener("click", async () => {
			await window.scheduledTasks.markDeleted(item.task.id);
			await loadAndRenderScheduledTasks();
		});

		el.appendChild(label);
		el.appendChild(doneBtn);
		el.appendChild(deleteBtn);

		scheduledList.appendChild(el);
	}
};

const loadAndRenderScheduledTasks = async () => {
	scheduledTasksCache = await window.scheduledTasks.load();
	renderScheduledTasks();
};

// Click → expand
document.addEventListener("click", () => {
	if (isExpanded) return;

	isExpanded = true;
	window.windowControls.expand();
	expandable.classList.remove("collapsed");
});

// 🔁 Listen for collapse from main process
window.windowControls.onCollapsed(() => {
	isExpanded = false;
	expandable.classList.add("collapsed");
});

loadAndRenderScheduledTasks();
scheduleClockUpdates();

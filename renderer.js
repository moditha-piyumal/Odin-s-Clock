let isExpanded = false;

const expandable = document.getElementById("expandable");
const clockElement = document.querySelector(".clock");
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

const padTime = (value) => String(value).padStart(2, "0");
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
document.getElementById("saveDailyTaskBtn").addEventListener("click", () => {
	dailyError.classList.add("hidden");

	if (!dailyNameInput.value || !dailyTimeInput.value) {
		dailyError.textContent = "Please enter a task name and time.";
		dailyError.classList.remove("hidden");
		return;
	}

	const task = {
		type: "daily",
		name: dailyNameInput.value.trim(),
		time: dailyTimeInput.value,
	};

	console.log("Daily task:", task);
});

document.getElementById("saveOneTimeTaskBtn").addEventListener("click", () => {
	oneError.classList.add("hidden");

	if (!oneNameInput.value || !oneDateInput.value || !oneTimeInput.value) {
		oneError.textContent = "Please fill all fields.";
		oneError.classList.remove("hidden");
		return;
	}

	const task = {
		type: "oneTime",
		name: oneNameInput.value.trim(),
		date: oneDateInput.value,
		time: oneTimeInput.value,
	};

	console.log("One-time task:", task);
});

const scheduleClockUpdates = () => {
	renderClock();

	const now = new Date();
	const msUntilNextMinute =
		(60 - now.getSeconds()) * 1000 - now.getMilliseconds();

	setTimeout(
		() => {
			renderClock();
			setInterval(renderClock, 60_000);
		},
		Math.max(msUntilNextMinute, 0),
	);
};

scheduleClockUpdates();

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

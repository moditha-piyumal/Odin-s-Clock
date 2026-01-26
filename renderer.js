let isExpanded = false;

const expandable = document.getElementById("expandable");
const clockElement = document.querySelector(".clock");
const dailyBtn = document.getElementById("dailyTaskBtn");
const oneTimeBtn = document.getElementById("oneTimeTaskBtn");
const dailyForm = document.getElementById("dailyTaskForm");
const oneTimeForm = document.getElementById("oneTimeTaskForm");

const padTime = (value) => String(value).padStart(2, "0");

const renderClock = () => {
	const now = new Date();
	const hours = padTime(now.getHours());
	const minutes = padTime(now.getMinutes());
	clockElement.textContent = `${hours}:${minutes}`;
};

dailyBtn.addEventListener("click", () => {
	dailyForm.classList.remove("hidden");
	oneTimeForm.classList.add("hidden");
});

oneTimeBtn.addEventListener("click", () => {
	oneTimeForm.classList.remove("hidden");
	dailyForm.classList.add("hidden");
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

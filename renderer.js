let isExpanded = false;
const storageKey = "scheduledTasks";

const expandable = document.getElementById("expandable");
const clockElement = document.querySelector(".clock");
const nextTaskElement = document.querySelector(".next-task");
const scheduledTasksList = document.getElementById("scheduled-tasks-list");
const scheduledEmptyState = document.getElementById("scheduled-empty");
const scheduleModalBackdrop = document.getElementById("schedule-modal-backdrop");
const openScheduleModalButton = document.getElementById("open-schedule-modal");
const closeScheduleModalButton = document.getElementById("close-schedule-modal");
const taskTypeStep = document.getElementById("task-type-step");
const taskDetailsStep = document.getElementById("task-details-step");
const taskTitleInput = document.getElementById("task-title");
const taskDateGroup = document.getElementById("task-date-group");
const taskDateInput = document.getElementById("task-date");
const taskTimeInput = document.getElementById("task-time");
const backToTypeButton = document.getElementById("back-to-type");
const taskTypeButtons = taskTypeStep.querySelectorAll("[data-task-type]");

let scheduledTasks = [];
let activeTaskType = null;

const padTime = (value) => String(value).padStart(2, "0");
const tasksFormatter = new Intl.DateTimeFormat("en-US", {
	weekday: "short",
	month: "short",
	day: "2-digit",
});

const renderClock = () => {
	const now = new Date();
	const hours = padTime(now.getHours());
	const minutes = padTime(now.getMinutes());
	clockElement.textContent = `${hours}:${minutes}`;
};

const scheduleClockUpdates = () => {
	renderClock();

	const now = new Date();
	const msUntilNextMinute =
		(60 - now.getSeconds()) * 1000 - now.getMilliseconds();

	setTimeout(() => {
		renderClock();
		setInterval(renderClock, 60_000);
	}, Math.max(msUntilNextMinute, 0));
};

scheduleClockUpdates();

const loadScheduledTasks = () => {
	try {
		const stored = localStorage.getItem(storageKey);
		scheduledTasks = stored ? JSON.parse(stored) : [];
	} catch (error) {
		scheduledTasks = [];
	}
};

const saveScheduledTasks = () => {
	localStorage.setItem(storageKey, JSON.stringify(scheduledTasks));
};

const getTaskDateTime = (task) => {
	if (task.type === "once") {
		return new Date(`${task.date}T${task.time}`);
	}

	const now = new Date();
	const [hours, minutes] = task.time.split(":").map(Number);
	const candidate = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate(),
		hours,
		minutes,
		0,
		0,
	);

	if (candidate < now) {
		candidate.setDate(candidate.getDate() + 1);
	}

	return candidate;
};

const formatTaskTime = (task, occurrence) => {
	const timeLabel = `${padTime(occurrence.getHours())}:${padTime(
		occurrence.getMinutes(),
	)}`;

	if (task.type === "daily") {
		const dateLabel = tasksFormatter.format(occurrence);
		return `Daily at ${timeLabel} • Next: ${dateLabel}`;
	}

	const dateLabel = tasksFormatter.format(occurrence);
	return `${dateLabel} at ${timeLabel}`;
};

const renderScheduledTasks = () => {
	const now = new Date();
	const tasksWithDates = scheduledTasks.map((task) => ({
		...task,
		occurrence: getTaskDateTime(task),
	}));

	tasksWithDates.sort(
		(a, b) => a.occurrence.getTime() - b.occurrence.getTime(),
	);

	scheduledTasksList
		.querySelectorAll(".scheduled-task")
		.forEach((node) => node.remove());

	if (tasksWithDates.length === 0) {
		scheduledEmptyState.classList.remove("hidden");
		nextTaskElement.textContent = "Next: (no tasks yet)";
		return;
	}

	scheduledEmptyState.classList.add("hidden");

	tasksWithDates.forEach((task) => {
		const taskElement = document.createElement("div");
		taskElement.className = "scheduled-task";

		const details = document.createElement("div");
		details.className = "scheduled-task-details";

		const title = document.createElement("div");
		title.className = "scheduled-task-title";
		title.textContent = task.title;

		const time = document.createElement("div");
		time.className = "scheduled-task-time";
		time.textContent = formatTaskTime(task, task.occurrence);

		const doneButton = document.createElement("button");
		doneButton.className = "secondary-button";
		doneButton.textContent = "Done";
		doneButton.addEventListener("click", () => {
			scheduledTasks = scheduledTasks.filter((item) => item.id !== task.id);
			saveScheduledTasks();
			renderScheduledTasks();
		});

		details.append(title, time);
		taskElement.append(details, doneButton);
		scheduledTasksList.append(taskElement);
	});

	const nextTask = tasksWithDates[0];
	nextTaskElement.textContent = `Next: ${nextTask.title} • ${formatTaskTime(
		nextTask,
		nextTask.occurrence,
	)}`;
};

const scheduleTaskUpdates = () => {
	const now = new Date();
	const msUntilNextMinute =
		(60 - now.getSeconds()) * 1000 - now.getMilliseconds();

	setTimeout(() => {
		renderScheduledTasks();
		setInterval(renderScheduledTasks, 60_000);
	}, Math.max(msUntilNextMinute, 0));
};

const resetModal = () => {
	activeTaskType = null;
	taskDetailsStep.classList.add("hidden");
	taskTypeStep.classList.remove("hidden");
	taskTitleInput.value = "";
	taskDateInput.value = "";
	taskTimeInput.value = "";
	taskDateGroup.classList.add("hidden");
	taskDateInput.required = false;
};

const openModal = () => {
	resetModal();
	scheduleModalBackdrop.classList.remove("hidden");
};

const closeModal = () => {
	scheduleModalBackdrop.classList.add("hidden");
};

openScheduleModalButton.addEventListener("click", () => {
	openModal();
});

closeScheduleModalButton.addEventListener("click", () => {
	closeModal();
});

scheduleModalBackdrop.addEventListener("click", (event) => {
	if (event.target === scheduleModalBackdrop) {
		closeModal();
	}
});

taskTypeButtons.forEach((button) => {
	button.addEventListener("click", () => {
		activeTaskType = button.dataset.taskType;
		taskTypeStep.classList.add("hidden");
		taskDetailsStep.classList.remove("hidden");
		taskDateGroup.classList.toggle("hidden", activeTaskType !== "once");
		taskDateInput.required = activeTaskType === "once";
	});
});

backToTypeButton.addEventListener("click", () => {
	resetModal();
});

taskDetailsStep.addEventListener("submit", (event) => {
	event.preventDefault();

	if (!activeTaskType) {
		return;
	}

	const title = taskTitleInput.value.trim();

	if (!title) {
		return;
	}

	const newTask = {
		id: crypto.randomUUID(),
		title,
		type: activeTaskType,
		time: taskTimeInput.value,
	};

	if (activeTaskType === "once") {
		newTask.date = taskDateInput.value;
	}

	scheduledTasks = [...scheduledTasks, newTask];
	saveScheduledTasks();
	renderScheduledTasks();
	closeModal();
});

loadScheduledTasks();
renderScheduledTasks();
scheduleTaskUpdates();

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

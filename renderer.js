let isExpanded = false;

const expandable = document.getElementById("expandable");

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

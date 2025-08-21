const port = chrome.runtime.connect({ name: "manage-records-to-background" });

document.addEventListener("DOMContentLoaded", async () => {
	const toggleButtons = document.querySelectorAll(".toggle-btn");
	const counterDisplay = document.getElementById("counter");
	const incrementBtn = document.getElementById("incrementBtn");
	const decrementBtn = document.getElementById("decrementBtn");
	const resetBtn = document.getElementById("resetBtn");
	const confirmBtn = document.getElementById("confirmBtn");
	const gobackBtn = document.getElementById("gobackBtn");
	const reConfirmBtn = document.getElementById("reConfirmBtn");
	const cancelModalBtn = document.getElementById("cancelModalBtn");
	const loadingOverlay = document.getElementById("loadingOverlay");

	let UserEmail = '';
	const result = await chrome.storage.local.get(['UserEmail', 'validPopup']);
	UserEmail = result.UserEmail;
	console.log("EPIC: UserEmail retrieved from storage:", UserEmail);

	function clearAllToggles() {
		toggleButtons.forEach(btn => btn.classList.remove("selected"));
	}

	function updateCounter(change) {
		let current = parseInt(counterDisplay.textContent);
		const newValue = Math.max(0, current + change);
		if (newValue !== current) {
			counterDisplay.textContent = newValue;
			if (newValue > 0) {
				clearAllToggles();
			}
		}
	}

	toggleButtons.forEach(btn => {
		btn.addEventListener("click", () => {
		if (parseInt(counterDisplay.textContent) !== 0) {
			counterDisplay.textContent = "0";
		}

		clearAllToggles();
		btn.classList.add("selected");
		});
	});

	incrementBtn.addEventListener("click", () => updateCounter(1));
	decrementBtn.addEventListener("click", () => updateCounter(-1));

	resetBtn.addEventListener("click", () => {
		clearAllToggles();
		counterDisplay.textContent = "0";
	});

	confirmBtn.addEventListener("click", async () => {
		document.getElementById("confirmationModal").classList.remove("hidden");
	});

	cancelModalBtn.addEventListener("click", async () => {
		document.getElementById("confirmationModal").classList.add("hidden");
	});


	reConfirmBtn.addEventListener("click", async () => {
		const selected = [...toggleButtons].find(btn => btn.classList.contains("selected"));
		const count = parseInt(counterDisplay.textContent);
		
		let selectedValue = "";
		let selectedCategory = "";
		if (selected) {
			const text = selected.textContent.trim();

			if (/^Delete ALL /.test(text)) {
				selectedCategory = text.replace("Delete ALL ", "");
			} else if (/^Delete Oldest \d+ Records/.test(text)) {
				const match = text.match(/Delete Oldest (\d+) Records/);
				selectedValue = match ? match[1] : "";
			}
		}

		console.log("EPIC: Selected Button:", selectedValue, selectedCategory);
		console.log("EPIC: Counter Value:", count);

		if (count === 0 && selectedValue === "" && selectedCategory === "") {
			console.log("EPIC: No action selected, nothing to apply.");
			window.close();
			return;
		}


		chrome.runtime.sendMessage({
			type: "DELETE_RECORDS",
			payload: {
				userEmail: UserEmail,
				deleteCount: (selectedValue=="") ? count : parseInt(selectedValue),
				deleteCategory: selectedCategory
			}
		});

		loadingOverlay.classList.remove("hidden");

	});

	gobackBtn.addEventListener("click", () => {
		console.log("Go Back clicked");
		window.close();
	});
});

port.onMessage.addListener(async (message) => {
	if (message.type === "RECORDS_DELETED") {
		const loadingOverlay = document.getElementById("loadingOverlay");
		const successOverlay = document.getElementById("successApplyOverlay");
		console.log("EPIC: Records deleted successfully:", message.payload);

		loadingOverlay.classList.add("hidden");
		successOverlay.classList.remove("hidden");
		await new Promise(resolve => setTimeout(resolve, 2000));
		successOverlay.classList.add("hidden");
		window.close();
	}
});

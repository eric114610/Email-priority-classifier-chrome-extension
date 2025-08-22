const MaxRecordCount = 100;
const maxWords = 100;

let UserEmail = '';
let validPopupChanged = false;
let validPopupStorage;

const port = chrome.runtime.connect({ name: "popup-to-background" });


document.addEventListener('DOMContentLoaded', async () => {
	await new Promise(resolve => setTimeout(resolve, 2000));
    const detailsBtn = document.getElementById("detailsBtn");
	const manageBtn = document.getElementById("manageBtn");
	const applyPromptBtn = document.getElementById("applyPromptBtn");
	const promptInput = document.getElementById("promptInput");
	const wordCountSpan = document.getElementById("wordCount");
	const cancelApplyBtn = document.getElementById("cancelApplyBtn");
	const confirmationModalDiv = document.getElementById("confirmationModal");
	const applyRerunBtn = document.getElementById("applyRerun");
	const applyNoRerunBtn = document.getElementById("applyNoRerun");
	const counterDisplay = document.getElementById("counter");
	const incrementBtn = document.getElementById("incrementBtn");
	const decrementBtn = document.getElementById("decrementBtn");
	const applyRecordsToProcessBtn = document.getElementById("applyRecordsToProcess");
	const loadingOverlay = document.getElementById("loadingOverlay");
	const successApplyOverlay = document.getElementById("successApplyOverlay");

	chrome.runtime.sendMessage({
		type: "CHECK_CONNECTION",
	});

	const result = await chrome.storage.local.get(['UserEmail', 'validPopup']);
	UserEmail = result.UserEmail;
	validPopupStorage = result.validPopup;
	console.log('EPIC: From storage for popup:', UserEmail, result.validPopup);


	detailsBtn.addEventListener("click", function() {
		window.open("learn_more.html", "LearnMore", "width=400,height=600");
	});

	manageBtn.addEventListener("click", function() {
		window.open("manage_records.html", "ManageRecords", "width=500,height=700");
	});

	promptInput.addEventListener("input", function() {
		let words = countWords(promptInput.value);
		if (words > maxWords) {
			// Trim to maxWords
			let trimmed = promptInput.value.split(/\s+/).slice(0, maxWords).join(" ");
			promptInput.value = trimmed;
			words = maxWords;
		}
		wordCountSpan.innerText = `${words}/${maxWords} words`;
	});

	applyPromptBtn.addEventListener("click", () => {
		confirmationModalDiv.classList.remove("hidden");
	});

	cancelApplyBtn.addEventListener("click", () => {
		confirmationModalDiv.classList.add("hidden");
	});

	function updateCounter(change) {
		let current = parseInt(counterDisplay.textContent);
		const newValue = Math.max(5, Math.min(50, current + change));
		if (newValue !== current) {
			counterDisplay.textContent = newValue;
		}
	}

	incrementBtn.addEventListener("click", () => updateCounter(5));
	decrementBtn.addEventListener("click", () => updateCounter(-5));

	applyRecordsToProcessBtn.addEventListener("click", () => {
		console.log("Applying records to process:", parseInt(counterDisplay.textContent), UserEmail);

		chrome.runtime.sendMessage({
			type: "APPLY_RECORDS_TO_PROCESS",
			payload: {
				recordsToProcess: parseInt(counterDisplay.textContent),
				userEmail: UserEmail
			}
		});
	});


	applyRerunBtn.addEventListener("click", () => {
		const promptValue = promptInput.value;

		if(promptValue === "") {
			console.log("Prompt is empty, not applying.");
			return;
		}

		loadingOverlay.classList.remove("hidden");

		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			if (tabs[0]?.id) {
				chrome.tabs.sendMessage(tabs[0].id, {
					Type: "PAUSE_CONTENT_SCRIPT",
					Pause: true
				});
			}
		});

		console.log("Applying prompt with re-run:", promptValue, UserEmail);

		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			chrome.scripting.executeScript({
				target: { tabId: tabs[0].id },
				function: () => {
					if (document.getElementById('reload-alert')) return; // don't duplicate

					const alertDiv = document.createElement('div');
					alertDiv.id = 'reload-alert';
					alertDiv.textContent = "⚠️ Don't Reload This Page!";
					alertDiv.style = `
					position: fixed;
					top: 20px;
					left: 50%;
					transform: translateX(-50%);
					background: #f44336;
					color: white;
					padding: 12px 20px;
					font-size: 18px;
					font-weight: bold;
					border-radius: 6px;
					box-shadow: 0 4px 6px rgba(0,0,0,0.3);
					z-index: 1000000;
					pointer-events: none;
					user-select: none;
					`;
					document.body.appendChild(alertDiv);
				}

			});
		});

		chrome.runtime.sendMessage({
			type: "APPLY_CUSTOM_PROMPT",
			payload: {
				customPrompt: promptValue,
				userEmail: UserEmail,
				reRun: true
			}
		});

	});

	applyNoRerunBtn.addEventListener("click", () => {
		const promptValue = promptInput.value;

		if(promptValue === "") {
			console.log("Prompt is empty, not applying.");
			return;
		}

		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			if (tabs[0]?.id) {
				chrome.tabs.sendMessage(tabs[0].id, {
				Type: "PAUSE_CONTENT_SCRIPT",
				Pause: true
				});
			}
		});

		console.log("Applying prompt with no re-run:", promptValue, UserEmail);

		chrome.runtime.sendMessage({
			type: "APPLY_CUSTOM_PROMPT",
			payload: {
				customPrompt: promptValue,
				userEmail: UserEmail,
				reRun: false
			}
		});
	});


	chrome.storage.onChanged.addListener((changes, areaName) => {
		if (areaName === "local" && changes.validPopup) {
			validPopupChanged = true;

			let isValid = changes.validPopup.newValue;

			applyPromptBtn.disabled = !isValid;
			applyPromptBtn.textContent = isValid ? "Apply" : "WAITING";

			manageBtn.disabled = !isValid;
			manageBtn.textContent = isValid ? "Manage" : "WAITING";

			applyRecordsToProcessBtn.disabled = !isValid;
			applyRecordsToProcessBtn.textContent = isValid ? "Apply Setting" : "WAITING";

			console.log("Popup updated with validPopup:", isValid);
		}
	});


	
	chrome.runtime.sendMessage({
		type: "GET_INIT_DATA",
		payload: {
			email: UserEmail
		}
	});

	setInterval(() => {
		chrome.runtime.sendMessage({
			type: "GET_DATA",
			payload: {
				email: UserEmail
			}
		});
	}, 5000);

});




function updateRecordUsage(current, max) {
	const percent = Math.min(100, Math.round((current / max) * 100));
	document.getElementById("recordBar").style.width = percent + "%";
	document.getElementById("recordCount").innerText = `${current}/${max}`;
}

function updateCategories(optional, notable, important, urgent, critical) {
	document.querySelector("#cat-optional .cat-value").textContent = optional;
	document.querySelector("#cat-notable .cat-value").textContent = notable;
	document.querySelector("#cat-important .cat-value").textContent = important;
	document.querySelector("#cat-urgent .cat-value").textContent = urgent;
	document.querySelector("#cat-critical .cat-value").textContent = critical;
}

function countWords(str) {
  	return str.trim().split(/\s+/).filter(Boolean).length;
}



port.onMessage.addListener(async (message) => {
	if (message.type === "INIT_DATA") {
		console.log("EPIC: Received INIT_DATA from background script:", message.userData);
		const applyRecordsToProcessBtn = document.getElementById("applyRecordsToProcess");
		const applyPromptBtn = document.getElementById("applyPromptBtn");
		const manageBtn = document.getElementById("manageBtn");

        updateRecordUsage(message.userData.Total_records, MaxRecordCount);
		updateCategories(message.userData.Optional, message.userData.Notable, message.userData.Important, message.userData.Urgent, message.userData.Critical);

		if (!validPopupChanged){
			applyPromptBtn.disabled = !validPopupStorage;
			applyPromptBtn.textContent = validPopupStorage ? "Apply" : "WAITING";

			manageBtn.disabled = !validPopupStorage;
			manageBtn.textContent = validPopupStorage ? "Manage" : "WAITING";
			validPopupChanged = true;

			applyRecordsToProcessBtn.disabled = !validPopupStorage;
			applyRecordsToProcessBtn.textContent = validPopupStorage ? "Apply Setting" : "WAITING";
		}
	} else if (message.type === "GET_DATA") {
		console.log("EPIC: Received GET_DATA from background script:", message.userData);
		updateRecordUsage(message.userData.Total_records, MaxRecordCount);
		updateCategories(message.userData.Optional, message.userData.Notable, message.userData.Important, message.userData.Urgent, message.userData.Critical);
	} else if (message.type === "RECORDS_APPLIED") {
		const successApplyOverlay = document.getElementById("successApplyOverlay");
		const successMessage = successApplyOverlay.querySelector('.successApply-message');
		successMessage.textContent = "Apply records to process Success! Reload the page to see changes.";
		console.log("EPIC: Received APPLY_RECORDS_TO_PROCESS from background script:", message.status);

		successApplyOverlay.classList.remove("hidden");
		setTimeout(() => {
			successApplyOverlay.classList.add("hidden");
		}, 2000);
	} else if( message.type === "PROMPT_APPLIED") {
		if (message.reRun) {
			const confirmationModalDiv = document.getElementById("confirmationModal");
			const loadingOverlay = document.getElementById("loadingOverlay");
			const successApplyOverlay = document.getElementById("successApplyOverlay");
			const successMessage = successApplyOverlay.querySelector('.successApply-message');
			successMessage.textContent = "Apply custom prompt Success!";

			console.log("EPIC: Received PROMPT_APPLIED from background script:", message);
			loadingOverlay.classList.add("hidden");
			confirmationModalDiv.classList.add("hidden");

			successApplyOverlay.classList.remove("hidden");
			await new Promise(resolve => setTimeout(resolve, 2000));
			successApplyOverlay.classList.add("hidden");

			chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
				const currentTab = tabs[0];
				if (currentTab && currentTab.id) {
					chrome.tabs.reload(currentTab.id);
					window.close();
				}
			});

			if(!message.status) {
				chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
					chrome.scripting.executeScript({
						target: { tabId: tabs[0].id },
						function: () => {
							const alertDiv = document.getElementById('reload-alert');
							if (alertDiv) alertDiv.remove();
						}
					});
				});
			}
		} else {
			const promptInput = document.getElementById("promptInput");
			const wordCount = document.getElementById("wordCount");
			const confirmationModalDiv = document.getElementById("confirmationModal");
			const successApplyOverlay = document.getElementById("successApplyOverlay");
			const successMessage = successApplyOverlay.querySelector('.successApply-message');
			successMessage.textContent = "Apply custom prompt Success!";

			console.log("EPIC: Received PROMPT_APPLIED from background script:", message);
			promptInput.value = "";
			wordCount.innerText = `${0}/${maxWords} words`;
			confirmationModalDiv.classList.add("hidden");

			successApplyOverlay.classList.remove("hidden");
			await new Promise(resolve => setTimeout(resolve, 2000));
			successApplyOverlay.classList.add("hidden");
		}
	} else if (message.type === "CHECK_CONNECTION") {
		console.log("EPIC: Connection check result:", message.status);
		if (!message.status) {
			const errorOverlay = document.getElementById("errorOverlay");
			errorOverlay.classList.remove("hidden");
		}
	}
});
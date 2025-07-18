import { getUserEmail } from './utils.js';

// --- Details Button ---
document.getElementById("detailsBtn").addEventListener("click", function() {
  window.open("learn_more.html", "LearnMore", "width=400,height=600");
});

// --- Manage Button ---
document.getElementById("manageBtn").addEventListener("click", function() {
  window.open("manage_records.html", "ManageRecords", "width=500,height=700");
});

// --- Record Usage Bar & Count (Template) ---
const MaxRecordCount = 100;

setTimeout(() => {

    let UserEmail = '';
    chrome.storage.local.get(['UserEmail', 'validPopup'], (result) => {
        UserEmail = result.UserEmail;
        console.log('UserEmail from storage for popup:', UserEmail, result.validPopup);

        setInterval(() => {
            fetch("http://localhost:8000/get_stats", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    Email: UserEmail,
                }),
            })
            .then((res) => res.json())
            .then((data) => {

              console.log("User data received from popup:", data);
              updateRecordUsage(data.Total_records, MaxRecordCount);
              updateCategories(data.Optional, data.Notable, data.Important, data.Urgent, data.Critical);
            })
            .catch((err) => {
              console.error("Error fetching User data from popup:", err);
            });  
        }, 4000);

        let applyBtn = document.getElementById("applyPromptBtn");
        applyBtn.disabled = !result.validPopup;
        applyBtn.textContent = result.validPopup ? "Apply" : "WAITING";

        let manageBtn = document.getElementById("manageBtn");
        manageBtn.disabled = !result.validPopup;
        manageBtn.textContent = result.validPopup ? "Manage" : "WAITING";
    });

}, 2000);

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


const promptInput = document.getElementById("promptInput");
const wordCount = document.getElementById("wordCount");
const maxWords = 100;

function countWords(str) {
  return str.trim().split(/\s+/).filter(Boolean).length;
}

promptInput.addEventListener("input", function() {
  let words = countWords(promptInput.value);
  if (words > maxWords) {
    // Trim to maxWords
    let trimmed = promptInput.value.split(/\s+/).slice(0, maxWords).join(" ");
    promptInput.value = trimmed;
    words = maxWords;
  }
  wordCount.innerText = `${words}/${maxWords} words`;
});


document.getElementById("applyPromptBtn").addEventListener("click", () => {
  document.getElementById("confirmationModal").classList.remove("hidden");
});

document.getElementById("cancelModalBtn").addEventListener("click", () => {
  document.getElementById("confirmationModal").classList.add("hidden");
});

document.getElementById("applyRerun").addEventListener("click", () => {
    const promptValue = document.getElementById("promptInput").value;
    console.log("apply with re-run.", promptValue);

    document.getElementById("loadingOverlay").classList.remove("hidden");

    let UserEmail = '';
    chrome.storage.local.get(['UserEmail'], (result) => {
        UserEmail = result.UserEmail;
        fetch("http://localhost:8000/apply_custom_prompt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                UserEmail: UserEmail,
                CustomPrompt: promptValue,
                reRun: true
            }),
        })
        .then((res) => res.json())
        .then((data) => {

          console.log("Response received from popup:", data);
          document.getElementById("loadingOverlay").classList.add("hidden");
          document.getElementById("confirmationModal").classList.add("hidden");

          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              const currentTab = tabs[0];
              if (currentTab && currentTab.id) {
                  chrome.tabs.reload(currentTab.id);
                  window.close();
              }
          });
        })
        .catch((err) => {
          console.error("Error applying prompt from popup:", err);
        });  
    });

});

document.getElementById("applyNoRerun").addEventListener("click", () => {
    const promptValue = document.getElementById("promptInput").value;
    console.log("apply without re-run.", promptValue);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          Type: "PAUSE_CONTENT_SCRIPT",
          Pause: true
        });
      }
    });

    let UserEmail = '';
    chrome.storage.local.get(['UserEmail'], (result) => {
        UserEmail = result.UserEmail;
        fetch("http://localhost:8000/apply_custom_prompt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                UserEmail: UserEmail,
                CustomPrompt: promptValue,
                reRun: false
            }),
        })
        .then((res) => res.json())
        .then((data) => {

          console.log("Response received from popup:", data);
          document.getElementById("confirmationModal").classList.add("hidden");

          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              const currentTab = tabs[0];
              if (currentTab && currentTab.id) {
                  chrome.tabs.reload(currentTab.id);
                  window.close();
              }
          });

        })
        .catch((err) => {
          console.error("Error applying prompt from popup:", err);
        });  
    });

});


chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.validPopup) {
        let isValid = changes.validPopup.newValue;

        const applyBtn = document.getElementById("applyPromptBtn");
        applyBtn.disabled = !isValid;
        applyBtn.textContent = isValid ? "Apply" : "WAITING";

        const manageBtn = document.getElementById("manageBtn");
        manageBtn.disabled = !isValid;
        manageBtn.textContent = isValid ? "Manage" : "WAITING";

        console.log("Popup updated with validPopup:", isValid);
    }
});
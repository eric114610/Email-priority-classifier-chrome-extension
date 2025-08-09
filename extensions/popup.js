import { getUserEmail } from './utils.js';

let validPopupChanged = false;

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
let UserEmail = '';

setTimeout(() => {

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

              if (!validPopupChanged){
                  let applyBtn = document.getElementById("applyPromptBtn");
                  applyBtn.disabled = !result.validPopup;
                  applyBtn.textContent = result.validPopup ? "Apply" : "WAITING";

                  let manageBtn = document.getElementById("manageBtn");
                  manageBtn.disabled = !result.validPopup;
                  manageBtn.textContent = result.validPopup ? "Manage" : "WAITING";
                  validPopupChanged = true;

                  applyRecordsToProcessBtn.disabled = !result.validPopup;
                  applyRecordsToProcessBtn.textContent = result.validPopup ? "Apply Setting" : "WAITING";
              }

            })
            .catch((err) => {
              console.error("Error fetching User data from popup:", err);
            });  
        }, 4000);

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

    if(promptValue === "") {
      console.log("Prompt is empty, not applying.");
      return;
    }

    document.getElementById("loadingOverlay").classList.remove("hidden");

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
                reRun: true
            }),
        })
        .then((res) => res.json())
        .then(async (data) => {

          console.log("Response received from popup:", data);
          document.getElementById("loadingOverlay").classList.add("hidden");
          document.getElementById("confirmationModal").classList.add("hidden");

          document.getElementById("successApplyOverlay").classList.remove("hidden");
          await new Promise(resolve => setTimeout(resolve, 2000));
          document.getElementById("successApplyOverlay").classList.add("hidden");

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

          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              function: () => {
                const alertDiv = document.getElementById('reload-alert');
                if (alertDiv) alertDiv.remove();
              }
            });
          });

        });  


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

              setTimeout(() => {
                console.log("Removing reload alert after 10 seconds");
                const el = document.getElementById('reload-alert');
                if (el) el.remove();
              }, 10000);
            }

          });
        });

    });

});

document.getElementById("applyNoRerun").addEventListener("click", () => {
    const promptValue = document.getElementById("promptInput").value;
    console.log("apply without re-run.", promptValue);
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
        .then(async (data) => {

          console.log("Response received from popup:", data);
          document.getElementById("promptInput").value = "";
          wordCount.innerText = `${0}/${maxWords} words`;
          document.getElementById("confirmationModal").classList.add("hidden");

          document.getElementById("successApplyOverlay").classList.remove("hidden");
          await new Promise(resolve => setTimeout(resolve, 2000));
          document.getElementById("successApplyOverlay").classList.add("hidden");

        })
        .catch((err) => {
          console.error("Error applying prompt from popup:", err);
        });  
    });

});


chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.validPopup) {
        validPopupChanged = true;

        let isValid = changes.validPopup.newValue;

        const applyBtn = document.getElementById("applyPromptBtn");
        applyBtn.disabled = !isValid;
        applyBtn.textContent = isValid ? "Apply" : "WAITING";

        const manageBtn = document.getElementById("manageBtn");
        manageBtn.disabled = !isValid;
        manageBtn.textContent = isValid ? "Manage" : "WAITING";

        applyRecordsToProcessBtn.disabled = !isValid;
        applyRecordsToProcessBtn.textContent = isValid ? "Apply Setting" : "WAITING";

        console.log("Popup updated with validPopup:", isValid);
    }
});


const counterDisplay = document.getElementById("counter");
const incrementBtn = document.getElementById("incrementBtn");
const decrementBtn = document.getElementById("decrementBtn");
const applyRecordsToProcessBtn = document.getElementById("applyRecordsToProcess");

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
    fetch("http://localhost:8000/apply_records_to_process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            UserEmail: UserEmail,
            RecordsToProcess: parseInt(counterDisplay.textContent)
        }),
    })
    .then((res) => res.json())
    .then((data) => {
        console.log("Response received from popup:", data);
        document.getElementById("successApplyOverlay").classList.remove("hidden");
        setTimeout(() => {
            document.getElementById("successApplyOverlay").classList.add("hidden");
        }, 2000);
    })
    .catch((err) => {
        console.error("Error applying records to process:", err);
    });
});

DEFAULT_RECORDS_TO_PROCESS = 10;
DEFAULT_MAIL_CLASS = "optional-reply-color";
SERVER_URL = "http://localhost:8000";

let popupPort = null;
let manageRecordsPort = null;

chrome.runtime.onConnect.addListener((port) => {
	if (port.name === "popup-to-background") {
		popupPort = port;
	} else if (port.name === "manage-records-to-background") {
		manageRecordsPort = port;
	}
});



chrome.runtime.onMessage.addListener( (msg, sender, sendResponse) => {
  if (msg.type === "EXTRACTED_DATA") {

    let userStats = {};
    chrome.storage.local.get(['userStats'], async (result) => {
        userStats = result.userStats;
        if (!userStats || !userStats.Records_to_process) {
            console.warn("User stats not found or Records_to_process is not set. Using default value of 5.");
            userStats.Records_to_process = DEFAULT_RECORDS_TO_PROCESS;
        }

        classNameArray = [];

        fetch(SERVER_URL+"/get_mail_class", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
              SenderEmail: msg.payload.contactData
                .filter((_, index) => index % 2 === 0 && index < 2*userStats.Records_to_process)
                .map(c => c.Email),
              SenderName: msg.payload.contactData
                .filter((_, index) => index % 2 === 0 && index < 2*userStats.Records_to_process)
                .map(c => c.Name),
              SenderSubject: msg.payload.subjectData
                .filter((_, index) => index < userStats.Records_to_process)
                .map(c => c.Text), 
              SenderPreview: msg.payload.previewData
                .filter((_, index) => index < userStats.Records_to_process)
                .map(c => c.Text),
              EmailDate: msg.payload.dateData
                .filter((_, index) => index < userStats.Records_to_process)
                .map(c => c.Date),
              UserEmail: msg.payload.email
          }),
        })
          .then((res) => res.json())
          .then((data) => {

            if (!checkMailClassData(data)) {
				return;
			}

            for(let i=0; i<data.MailClass.length; i++) {
                let className = "";
                switch (data.MailClass[i][1]) {
                  case "Optional":
                      className = "optional-reply-color"
                    break;
                  case "Notable":
                      className = "notable-reply-color"
                    break;
                  case "Important":
                      className = "important-reply-color"
                    break;
                  case "Urgent":
                      className = "urgent-reply-color"
                    break;
                  case "Critical":
                      className = "critical-reply-color"
                    break;
                  default:
                    console.warn("EPIC: Unknown class type:", data.MailClass[i][1]);
                    className = DEFAULT_MAIL_CLASS;
                    break;
                }

                classNameArray.push({
                  ID: data.MailClass[i][0],
                  className: className
                });
            }

            chrome.tabs.sendMessage(sender.tab.id, {
              Type: "HIGHLIGHT_MAIL_ARRAY",
              ClassNameArray: classNameArray
            });
            console.log("EPIC: Background script sent classNameArray to content.js for highlighting", classNameArray);

          })
          .catch((err) => {
            console.error("EPIC: Error fetching from backend in EXTRACTED_DATA:", err);
          });

        console.log("EPIC: Background script received extracted data and complated");
        chrome.storage.local.set({ validPopup: true });

    });
  
	} else if (msg.type === "NEW_MAIL_DATA") {
		fetch(SERVER_URL+"/get_mail_class", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ 
			SenderEmail: [msg.payload.email],
			SenderName: [msg.payload.name],
			SenderSubject: [msg.payload.subject],
			SenderPreview: [msg.payload.preview],
			EmailDate: [msg.payload.date],
			UserEmail: msg.payload.userEmail
		}),
		})
		.then((res) => res.json())
		.then((data) => {

			if (!checkMailClassData(data)) {
				return;
			}

			let className = "";
			switch (data.MailClass[0][1]) {
			case "Optional":
				className = "optional-reply-color"
				break;
			case "Notable":
				className = "notable-reply-color"
				break;
			case "Important":
				className = "important-reply-color"
				break;
			case "Urgent":
				className = "urgent-reply-color"
				break;
			case "Critical":
				className = "critical-reply-color"
				break;
			default:
				console.warn("EPIC: Unknown class type:", data.MailClass[0][1]);
				className = DEFAULT_MAIL_CLASS;
				break;
			}

			chrome.tabs.sendMessage(sender.tab.id, {
				Type: "NEW_HIGHLIGHT_MAIL",
				ClassName: className
			});
			console.log("EPIC: Background script sent className to content.js for highlighting", className);

		})
		.catch((err) => {
			console.error("EPIC: Error fetching from backend in NEW_MAIL_DATA:", err);
		});

	} else if (msg.type === "GET_STATS") {

		fetch(SERVER_URL+"/get_stats", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ 
			Email: msg.payload.email,
		}),
		})
		.then((res) => res.json())
		.then((data) => {
			chrome.storage.local.set({ userStats: data, stats_updated: true });
		})
		.catch((err) => {
			console.error("EPIC: Error fetching from backend in GET_STATS:", err);
		});
	} else if (msg.type === "UPDATE_USER_EMAIL") {
		chrome.storage.local.set({ UserEmail: msg.payload.email });
		console.log("EPIC: Background script updated UserEmail:", msg.payload.email);
	} else if (msg.type === "GET_INIT_DATA") {
		console.log("EPIC: Background script received GET_INIT_DATA request for email:", msg.payload.email);
		fetch(SERVER_URL+"/get_stats", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ 
				Email: msg.payload.email,
			}),
		})
		.then((res) => res.json())
		.then((data) => {
			popupPort.postMessage({ type:"INIT_DATA", userData: data });
		})
		.catch((err) => {
			console.error("EPIC: Error fetching from backend in GET_INIT_DATA:", err);
		});
  	} else if (msg.type === "GET_DATA") {
		console.log("EPIC: Background script received GET_DATA request for email:", msg.payload.email);
		fetch(SERVER_URL+"/get_stats", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ 
				Email: msg.payload.email,
			}),
		})
		.then((res) => res.json())
		.then((data) => {
			popupPort.postMessage({ type:"GET_DATA", userData: data });
		})
		.catch((err) => {
			console.error("EPIC: Error fetching from backend in GET_DATA:", err);
		});
  	} else if (msg.type === "APPLY_RECORDS_TO_PROCESS") {
		console.log("EPIC: Background script received APPLY_RECORDS_TO_PROCESS request with data:", msg.payload);
		fetch(SERVER_URL+"/apply_records_to_process", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				UserEmail: msg.payload.userEmail,
				RecordsToProcess: msg.payload.recordsToProcess
			}),
		})
		.then((res) => res.json())
		.then((data) => {
			console.log("EPIC: Response from apply_records_to_process:", data);
			popupPort.postMessage({ type: "RECORDS_APPLIED", status: (data != null) });
		})
		.catch((err) => {
			console.error("EPIC: Error fetching from backend in APPLY_RECORDS_TO_PROCESS:", err);
		});
	} else if (msg.type === "APPLY_CUSTOM_PROMPT") {
		console.log("EPIC: Background script received APPLY_RECORDS_TO_PROCESS request with data:", msg.payload);
		fetch(SERVER_URL+"/apply_custom_prompt", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ 
				UserEmail: msg.payload.userEmail,
				CustomPrompt: msg.payload.customPrompt,
				reRun: msg.payload.reRun
			}),
		})
		.then((res) => res.json())
		.then((data) => {
			console.log("EPIC: Response from apply_custom_prompt:", data);
			popupPort.postMessage({ type: "PROMPT_APPLIED", status: (data != null), reRun: msg.payload.reRun });
		})
		.catch((err) => {
			console.error("EPIC: Error fetching from backend in APPLY_CUSTOM_PROMPT:", err);
		});
	} else if (msg.type === "DELETE_RECORDS") {
		console.log("EPIC: Background script received DELETE_RECORDS request with data:", msg.payload);
		fetch(SERVER_URL+"/delete_record", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ 
				UserEmail: msg.payload.userEmail,
				DeleteCount: msg.payload.deleteCount,
				DeleteCategory: msg.payload.deleteCategory
			}),
		})
		.then((res) => res.json())
		.then((data) => {
			console.log("EPIC: Response from delete_record:", data);
			manageRecordsPort.postMessage({ type: "RECORDS_DELETED", status: (data != null)});
		})
		.catch((err) => {
			console.error("EPIC: Error fetching from backend in APPLY_CUSTOM_PROMPT:", err);
		});
	}

});


chrome.tabs.onActivated.addListener(activeInfo => {
    chrome.tabs.get(activeInfo.tabId, tab => {
        if (tab.url && tab.url.includes("mail.google.com")) {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: retrieveUserEmail
            });
        }
    });
});

function retrieveUserEmail() {
    UserEmail = document.querySelector('.gb_B.gb_Za.gb_0').getAttribute('aria-label');
    const start = UserEmail.indexOf('(');
    const end = UserEmail.indexOf('@', start);

    if (start !== -1 && end !== -1) {
        UserEmail = UserEmail.substring(start + 1, end);
        console.log("User email found:", UserEmail);
        chrome.runtime.sendMessage({ 
            type: "UPDATE_USER_EMAIL",
            payload: {
                email: UserEmail
            } 
        });
    } else {
        console.error("Failed to extract user email from Gmail page");
        return;
    }
}


function checkMailClassData(data) {
	if (!data || !data.MailClass || data.MailClass.length === 0) {
		console.warn("EPIC: No classification results found in the response.");
		return false;
	} 

	const isDataCorrect = data.MailClass.every(
		row => row[0] !== null && typeof row[0] === "number" && 
		row[1] !== null && typeof row[1] === "string");

	if (!isDataCorrect) {
		console.error("EPIC: Data format is incorrect:", data.MailClass);
		return false;
	}

	return true;
}
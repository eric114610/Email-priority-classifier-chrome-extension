
console.log("Background script loaded");


chrome.runtime.onMessage.addListener( (msg, sender, sendResponse) => {
  if (msg.type === "EXTRACTED_DATA") {

    let userStats = {};
    chrome.storage.local.get(['userStats'], async (result) => {
        userStats = result.userStats;
        console.log("Stats:", userStats.Records_to_process);
        

        classNameArray = [];

        fetch("http://localhost:8000/get_mail_class", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
              SenderEmail: msg.payload.contacts
                .filter((_, index) => index % 2 === 0 && index < 2*userStats.Records_to_process)
                .map(c => c.Email),
              SenderName: msg.payload.contacts
                .filter((_, index) => index % 2 === 0 && index < 2*userStats.Records_to_process)
                .map(c => c.Name),
              SenderSubject: msg.payload.subjects
                .filter((_, index) => index < userStats.Records_to_process)
                .map(c => c.Text), 
              SenderPreview: msg.payload.previews
                .filter((_, index) => index < userStats.Records_to_process)
                .map(c => c.Text),
              EmailDate: msg.payload.dates
                .filter((_, index) => index < userStats.Records_to_process)
                .map(c => c.Date),
              UserEmail: msg.payload.email
          }),
        })
          .then((res) => res.json())
          .then((data) => {

            console.log("Classification results received from backend:", data);

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
            console.log("Background script sent classNameArray to content.js for highlighting", classNameArray);

          })
          .catch((err) => {
            console.error("Error fetching from backend:", err);
          });

        console.log("Background script received extracted data and complated");
        chrome.storage.local.set({ validPopup: true });

    });
  
  } else if (msg.type === "NEW_MAIL_DATA") {
    fetch("http://localhost:8000/get_mail_class", {
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

        console.log("New results received from backend:", data);

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
            break;
        }

        chrome.tabs.sendMessage(sender.tab.id, {
          Type: "NEW_HIGHLIGHT_MAIL",
          ClassName: className
        });
        console.log("Background script sent className to content.js for highlighting", className);

      })
      .catch((err) => {
        console.error("Error fetching from backend:", err);
      });

    console.log("Background script received extracted data and complated");
  } else if (msg.type === "GET_STATS") {
    console.log("Background script received get_stats request:", msg.payload.email);
    
    fetch("http://localhost:8000/get_stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
          Email: msg.payload.email,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("User stats received from backend:", data);
        chrome.storage.local.set({ userStats: data, stats_updated: true });
      })
      .catch((err) => {
        console.error("Error fetching from backend:", err);
      });
  } else if (msg.type === "UPDATE_USER_DATA") {
    console.log("Background script received update_user_data request:", msg.payload.email);
    
    updateUserData(msg.payload.email);
  }
  // console.log("Background script received message:", msg);
});

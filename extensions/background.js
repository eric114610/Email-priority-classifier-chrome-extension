
console.log("Background script loaded");


chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (msg.type === "EXTRACTED_DATA") {

    for (let i=0; i < (10 / 5); i++) {
        const classNameArray = [];
        const fetchPromises = [];

        for (let j = i*5; (j < (i+1)*5) && (j < msg.payload.previews.length); j++) {
        
          const fetchPromise = fetch("http://localhost:8000/get_mail_class", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                SenderEmail: msg.payload.contacts[j*2].Email, 
                SenderName: msg.payload.contacts[j*2].Name, 
                SenderSubject: msg.payload.subjects[j].Text, 
                SenderPreview: msg.payload.previews[j].Text,
                EmailDate: msg.payload.dates[j].Date,
                UserEmail: msg.payload.email
            }),
          })
            .then((res) => res.json())
            .then((data) => {

              console.log("Reply suggestion received from backend:", data.MailClass, j);
              let className = "";
              switch (data.MailClass) {
                case "Optional\n":
                    className = "optional-reply-color"
                  break;
                case "Notable\n":
                    className = "notable-reply-color"
                  break;
                case "Important\n":
                    className = "important-reply-color"
                  break;
                case "Urgent\n":
                    className = "urgent-reply-color"
                  break;
                case "Critical\n":
                    className = "critical-reply-color"
                  break;
                default:
                  break;
              }

              classNameArray.push({
                ID: msg.payload.contacts[j].ID,
                className: className
              });
              // chrome.storage.local.set({ replySuggestion: data.reply });
            })
            .catch((err) => {
              console.error("Error fetching from backend:", err);
            });

          fetchPromises.push(fetchPromise);
        }

        Promise.all(fetchPromises).then(() => {
          if (classNameArray.length > 0) {
            chrome.tabs.sendMessage(sender.tab.id, {
              Type: "HIGHLIGHT_MAIL_ARRAY",
              ClassNameArray: classNameArray
            });
            console.log("Background script sent classNameArray to content.js for highlighting Loop", i);
          }
        });

        await new Promise(res => setTimeout(res, 15000));
    }

    console.log("Background script received extracted data and complated");
    chrome.storage.local.set({ validPopup: true });
  
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

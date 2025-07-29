console.log("Content script loaded");
let PAUSED = false;

setTimeout(() => {
    UserEmail = document.querySelector('.gb_B.gb_Za.gb_0').getAttribute('aria-label');
    const start = UserEmail.indexOf('(');
    const end = UserEmail.indexOf('@', start);

    if (start !== -1 && end !== -1) {
        UserEmail = UserEmail.substring(start + 1, end);
        console.log(UserEmail);
        chrome.storage.local.set({ UserEmail: UserEmail });
        chrome.storage.local.set({ validPopup: false });
    } else {
        return;
    }
    

    const mainDiv = document.querySelector('div.aIf-aLe');
    if (mainDiv?.getAttribute('aria-selected') !== 'true') {
        console.log('Wrong table div', mainDiv?.getAttribute('aria-label'));
        return;
    }

    chrome.runtime.sendMessage({
        type: "GET_STATS",
        payload: {
            email: UserEmail
        }
    });

    const extractedContactData = [];
    const outerSpansContact = document.querySelectorAll('.bA4');

    outerSpansContact.forEach((outerSpan, index) => {
        const innerSpan = outerSpan.querySelector('span[email]');

        if (innerSpan) {
            const email = innerSpan.getAttribute('email');
            const name = innerSpan.getAttribute('name');

            extractedContactData.push({
                ID: index,
                Email: email,
                Name: name
            });
        }
    });


    const extractedSubjectData = [];
    const outerSpansSubject = document.querySelectorAll('span.bog');

    outerSpansSubject.forEach((outerSpan, index) => {
        const innerSpan = outerSpan.querySelector('span');

        if (innerSpan) {
            const textContent = innerSpan.textContent;
            extractedSubjectData.push({
                ID: index,
                Text: textContent
            });
        }
    });


    const extractedPreviewData = [];
    const outerSpansPreView = document.querySelectorAll('.y2');

    outerSpansPreView.forEach((outerSpan, index) => {
        const textContent = outerSpan.textContent;
        extractedPreviewData.push({
            ID: index,
            Text: textContent
        });
    });

    const extractedDateData = [];
    const outerTdDate = document.querySelectorAll('.xW.xY');

    outerTdDate.forEach((outerTd, index) => {
        const innerSpan = outerTd.querySelector('span');

        if (innerSpan) {
            const DateContent = innerSpan?.getAttribute('title');
            extractedDateData.push({
                ID: index,
                Date: DateContent
            });
        }
    });


    if (extractedContactData.length > 0 && extractedSubjectData.length > 0 && extractedPreviewData.length > 0 && extractedDateData.length > 0) {
        console.log("testDate:", extractedDateData);
        chrome.runtime.sendMessage({
            type: "EXTRACTED_DATA",
            payload: {
                contacts: extractedContactData,
                subjects: extractedSubjectData,
                previews: extractedPreviewData,
                dates: extractedDateData,
                email: UserEmail
            }
        });

        console.log("SmartReply: Extracted data sent to background.js");
    }

    const table = document.querySelector('.F.cf.zt');
    const emailObserver = new MutationObserver((mutationsList) => {
        if (PAUSED) {
            console.log("Content script is paused, skipping email row mutation detection");
            return;
        }

        console.log("Email row mutation detected");
        for (const mutation of mutationsList) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType === 1 && node.matches('.zA.zE')) {
                    console.log('New email row detected');
                    let tmpEmail = node.querySelector('.bA4').querySelector('span[email]').getAttribute('email');
                    let tmpName = node.querySelector('.bA4').querySelector('span[email]').getAttribute('name');
                    let tmpSubject = node.querySelector('.bog').querySelector('span').textContent;
                    let tmpPreview = node.querySelector('.y2').textContent;
                    let tmpDate = node.querySelector('.xW.xY').querySelector('span').getAttribute('title');
                    console.log("New email row detected:", tmpEmail, tmpName, tmpSubject, tmpPreview);

                    tmpMap = new Map();

                    for (const [ID, className] of lastHighlights.entries()) {
                        tmpMap.set(Number(ID)+1, className);
                        console.log("Old Map:", ID, className);
                    }

                    let NewClassName = "";
                    fetch("http://localhost:8000/get_mail_class", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ 
                            SenderEmail: tmpEmail, 
                            SenderName: tmpName, 
                            SenderSubject: tmpSubject, 
                            SenderPreview: tmpPreview,
                            EmailDate: tmpDate,
                            UserEmail: UserEmail
                        }),
                    })
                        .then((res) => res.json())
                        .then((data) => {
                        console.log("New MailClass received from backend:", data.MailClass);
                        switch (data.MailClass) {
                            case "Optional\n":
                                NewClassName = "optional-reply-color"
                            break;
                            case "Notable\n":
                                NewClassName = "notable-reply-color"
                            break;
                            case "Important\n":
                                NewClassName = "important-reply-color"
                            break;
                            case "Urgent\n":
                                NewClassName = "urgent-reply-color"
                            break;
                            case "critical\n":
                                NewClassName = "critical-reply-color"
                            break;
                            default:
                            break;
                        }

                        removeHighlights();
                        tmpMap.set(0, NewClassName);
                        lastHighlights = tmpMap;
                        
                        for (const [ID, className] of lastHighlights.entries()) {
                            console.log("New Map:", ID, className);
                        }
                        
                        applyHighlights();
                    });

                }
            }
        }
    });
    emailObserver.observe(table, { childList: true, subtree: true });


}, 3000);


function isCorrectTable() {
    const mainDiv = document.querySelector('div.aIf-aLe');
    if (mainDiv?.getAttribute('aria-selected') !== 'true') {
        console.log('Wrong table div', mainDiv?.getAttribute('aria-label'));
        return false;
    }

    const divM7 = document.getElementById(':m7');
    if (divM7) {
        const spanTs = divM7.querySelector('span.ts');
        if (spanTs) {
            const text = spanTs.textContent;
            if(text !== "1") {
                console.log("Wrong table, ts text is not 1:", text);
                return false;
            }
        }
    }

    return true;
}

let lastHighlights = new Map();

function addHighlights(classNameArray) {
    for (const { ID, className } of classNameArray) {
        if (!lastHighlights.has(ID)) {
            lastHighlights.set(ID, className);
        }
    }
}

function applyHighlights() {
    if (!isCorrectTable()) {
        return;
    }

    const outerSpansContact = document.querySelectorAll('.bA4');
    const outerSpansSubject = document.querySelectorAll('span.bog');
    const outerSpansPreView = document.querySelectorAll('.y2');

    for (const [ID, className] of lastHighlights.entries()) {
        
        const outerSpanContact = outerSpansContact[ID*2+1]; // ID for contacts is odd
        const outerSpanSubject = outerSpansSubject[ID];
        const outerSpanPreView = outerSpansPreView[ID];

        if (outerSpanContact) {
            const innerSpanContact = outerSpanContact.querySelector('span[email]');
            if (innerSpanContact) {
                innerSpanContact.classList.add(className);
            }
        }

        if (outerSpanSubject) {
            const innerSpanSubject = outerSpanSubject.querySelector('span');
            if (innerSpanSubject) {
                innerSpanSubject.classList.add(className);
            }
        }

        if (outerSpanPreView) {
            outerSpanPreView.classList.add(className);
        }
    }
}

function removeHighlights() {
    if (!isCorrectTable()) {
        return;
    }

    const outerSpansContact = document.querySelectorAll('.bA4');
    const outerSpansSubject = document.querySelectorAll('span.bog');
    const outerSpansPreView = document.querySelectorAll('.y2');

    for (const [ID, className] of lastHighlights.entries()) {
        const outerSpanContact = outerSpansContact[ID * 2 + 1]; // same index logic
        const outerSpanSubject = outerSpansSubject[ID];
        const outerSpanPreView = outerSpansPreView[ID];

        if (outerSpanContact) {
            const innerSpanContact = outerSpanContact.querySelector('span[email]');
            if (innerSpanContact) {
                innerSpanContact.classList.remove(className);
            }
        }

        if (outerSpanSubject) {
            const innerSpanSubject = outerSpanSubject.querySelector('span');
            if (innerSpanSubject) {
                innerSpanSubject.classList.remove(className);
            }
        }

        if (outerSpanPreView) {
            outerSpanPreView.classList.remove(className);
        }
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Content script received message:", message);
    if (message.Type === "HIGHLIGHT_MAIL_ARRAY") {
        addHighlights(message.ClassNameArray);
        applyHighlights();
    } else if (message.Type === "PAUSE_CONTENT_SCRIPT") {
        PAUSED = message.Pause;
        if (PAUSED) {
            console.log("Content script paused");
        }
    }
});


const observer = new MutationObserver(() => {
    console.log("DOM changed, re-applying highlights");
    if (lastHighlights.size > 0) {
        // console.log("Re-applying highlights after DOM change");
        applyHighlights();
    }
});
observer.observe(document.body, { childList: true, subtree: true });
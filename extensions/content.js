let PAUSED = false;
let userEmail = '';
let lastHighlights = new Map();

if (document.readyState === 'loading') {
  console.log("EPIC: DOM is not ready, waiting for it to load");
  document.addEventListener('DOMContentLoaded', onDomReady);
} else {
  onDomReady();
}

async function onDomReady() {
    chrome.storage.local.set({validPopup: false});
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log("EPIC: DOM is ready, starting content script");

    const userProfileButton = document.querySelector('.gb_B.gb_Za.gb_0');

    if (userProfileButton) {
        userEmail = userProfileButton.getAttribute('aria-label');
    }

    if (userEmail) {
        const pStart = userEmail.indexOf('(');
        const pEnd = userEmail.indexOf('@', pStart);

        if (pStart !== -1 && pEnd !== -1) {
            userEmail = userEmail.substring(pStart + 1, pEnd);
            chrome.storage.local.set({ userEmail: userEmail, stats_updated: false });
        } else {
            console.error("EPIC: Failed to extract userEmail from DOM");
            return;
        }
    } else {
        console.error("EPIC: Failed to extract userEmail from DOM");
        return;
    }
    
    if (!isCorrectTable()) {
        console.error("EPIC: Not the correct table, exiting content script");
        return;
    }

    const isConnected = await checkConnection();
    if (!isConnected) {
        console.error("EPIC: Failed to connect to the backend, exiting content script");
        return;
    }


    const extractedContactData = [];
    const extractedSubjectData = [];
    const extractedPreviewData = [];
    const extractedDateData = [];

    const outerSpansContact = document.querySelectorAll('.bA4');
    const outerSpansSubject = document.querySelectorAll('span.bog');
    const outerSpansPreView = document.querySelectorAll('.y2');
    const outerTdDate = document.querySelectorAll('.xW.xY');


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

    outerSpansPreView.forEach((outerSpan, index) => {
        const textContent = outerSpan.textContent;
        extractedPreviewData.push({
            ID: index,
            Text: textContent
        });
    });

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


    if ((extractedContactData.length/2 == extractedSubjectData.length) && (extractedSubjectData.length == extractedPreviewData.length) && (extractedPreviewData.length == extractedDateData.length)) {
        chrome.runtime.sendMessage({
            type: "EXTRACTED_DATA",
            payload: {
                contactData: extractedContactData,
                subjectData: extractedSubjectData,
                previewData: extractedPreviewData,
                dateData: extractedDateData,
                email: userEmail
            }
        });

        console.log("EPIC: Extracted data sent to background.js");
    } else {
        console.error("EPIC: Failed to extract all required data from the DOM");
        return;
    }


    const mailTable = document.querySelector('.F.cf.zt');
    const emailObserver = new MutationObserver((mutationsList) => {
        if (PAUSED) {
            console.log("EPIC: Content script is paused, skipping email row mutation detection");
            return;
        }

        console.log("Email row mutation detected");
        for (const mutation of mutationsList) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType === 1 && node.matches('.zA.zE')) {
                    let tmpEmail = node.querySelector('.bA4').querySelector('span[email]').getAttribute('email');
                    let tmpName = node.querySelector('.bA4').querySelector('span[email]').getAttribute('name');
                    let tmpSubject = node.querySelector('.bog').querySelector('span').textContent;
                    let tmpPreview = node.querySelector('.y2').textContent;
                    let tmpDate = node.querySelector('.xW.xY').querySelector('span').getAttribute('title');
                    console.log("New email row detected:", tmpEmail, tmpName, tmpSubject, tmpPreview);

                    chrome.runtime.sendMessage({
                        type: "NEW_MAIL_DATA",
                        payload: {
                            email: tmpEmail,
                            name: tmpName,
                            subject: tmpSubject,
                            preview: tmpPreview,
                            date: tmpDate,
                            userEmail: userEmail
                        }
                    });

                }
            }
        }
    });

    if (mailTable) {
        emailObserver.observe(mailTable, { childList: true, subtree: true });
    } else {
        console.error("EPIC: Mail table not found, cannot observe for new email rows");
    }

};


function isCorrectTable() {
    const MainDiv = document.querySelector('div.aIf-aLe');
    if (MainDiv?.getAttribute('aria-selected') !== 'true') {
        return false;
    }

    const divM7 = document.getElementById(':m7');
    if (divM7) {
        const spanTs = divM7.querySelector('span.ts');
        if (spanTs) {
            const text = spanTs.textContent;
            if(text !== "1") {
                return false;
            }
        }
    }

    return true;
}


function addMailHighlights(classNameArray) {
    for (const { ID, className } of classNameArray) {
        if (!lastHighlights.has(ID)) {
            lastHighlights.set(ID, className);
        }
    }
}

function applyMailHighlights() {
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

function removeMailHighlights() {
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

function updateMailHighlights(ClassName) {
    tmpMap = new Map();

    for (const [ID, className] of lastHighlights.entries()) {
        if(Number(ID) == 49)
            continue;
        tmpMap.set(Number(ID)+1, className);
        console.log("Old Map:", ID, className);
    }

    removeMailHighlights();

    tmpMap.set(0, ClassName)

    lastHighlights = tmpMap;
    for (const [ID, className] of lastHighlights.entries()) {
        console.log("New Map:", ID, className);
    }

    applyMailHighlights();
}


async function checkConnection() {
    chrome.runtime.sendMessage({
        type: "GET_STATS",
        payload: {
            email: userEmail
        }
    });

    let statsUpdated = false;
    let counter = 0;
    while(!statsUpdated) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        chrome.storage.local.get(['stats_updated'], (result) => {
            statsUpdated = result.stats_updated;
        });
        counter++;
        if (counter > 30) {
            console.warn("EPIC: Timeout waiting for stats update, connection check failed");
            return false;
        }
    }

    return true;
}



chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.Type === "HIGHLIGHT_MAIL_ARRAY") {
        addMailHighlights(message.ClassNameArray);
        applyMailHighlights();
    } else if (message.Type === "NEW_HIGHLIGHT_MAIL") {
        updateMailHighlights(message.ClassName);
    }else if (message.Type === "PAUSE_CONTENT_SCRIPT") {
        PAUSED = message.Pause;
        if (PAUSED) {
            console.log("Content script paused");
        }
    }
});

const observer = new MutationObserver(() => {
    console.log("EPIC: DOM changed, re-applying highlights");
    if (lastHighlights.size > 0) {
        applyMailHighlights();
    }
});
observer.observe(document.body, { childList: true, subtree: true });

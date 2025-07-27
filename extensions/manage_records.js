document.addEventListener("DOMContentLoaded", () => {
  const toggleButtons = document.querySelectorAll(".toggle-btn");
  const counterDisplay = document.getElementById("counter");
  const incrementBtn = document.getElementById("incrementBtn");
  const decrementBtn = document.getElementById("decrementBtn");
  const resetBtn = document.getElementById("resetBtn");
  const confirmBtn = document.getElementById("confirmBtn");
  const gobackBtn = document.getElementById("gobackBtn");
  const reConfirmBtn = document.getElementById("reConfirmBtn");
  const cancelModalBtn = document.getElementById("cancelModalBtn");

  let UserEmail = '';
    chrome.storage.local.get(['UserEmail', 'validPopup'], (result) => {
        UserEmail = result.UserEmail;
        console.log('UserEmail from storage for popup:', UserEmail, result.validPopup);
    });

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

    console.log("Selected Button:", selectedValue, selectedCategory);
    console.log("Counter Value:", count);

    if (count === 0 && selectedValue === "" && selectedCategory === "") {
      console.log("No action selected, nothing to apply.");
      window.close();
      return;
    }

    while(UserEmail == '') {
      console.log("Waiting for UserEmail to be set in  manage_records");
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    fetch("http://localhost:8000/delete_record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            UserEmail: UserEmail,
            DeleteCount: (selectedValue=="") ? count : parseInt(selectedValue),
            DeleteCategory: selectedCategory
        }),
    })
    .then((res) => res.json())
    .then( async (data) => {
      console.log("Response received from manage_records:", data);
      await new Promise(resolve => setTimeout(resolve, 1000));
      window.close();
    })
    .catch((err) => {
      console.error("Error applying prompt from popup:", err);
    });  


  });

  gobackBtn.addEventListener("click", () => {
    console.log("Go Back clicked");
    window.close();
  });
});

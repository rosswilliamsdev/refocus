// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TIMER_EXPIRED") {
    showTimeUpModal();
  }
});

function showTimeUpModal() {
  // Remove any existing modal
  const existingModal = document.getElementById("refocus-modal");
  if (existingModal) {
    existingModal.remove();
  }

  // Create modal HTML
  const modal = document.createElement("div");
  modal.id = "refocus-modal";
  modal.innerHTML = `
    <div class="refocus-overlay">
      <div class="refocus-modal">
        <div class="refocus-header">
          <h2>🎯 Time to reFocus!</h2>
        </div>
        <div class="refocus-body">
          <p>Your time is up! Reset the timer for more time or move on to your next task.</p>
        </div>
        <div class="refocus-buttons">
          <button id="refocus-reset" class="refocus-btn refocus-primary">
            Reset Timer (5 min)
          </button>
          <button id="refocus-dismiss" class="refocus-btn refocus-secondary">
            Move On
          </button>
        </div>
      </div>
    </div>
  `;

  // Add modal to body
  document.body.appendChild(modal);

  // Add event listeners
  document
    .getElementById("refocus-reset")
    .addEventListener("click", async () => {
      const hostname = window.location.hostname;
      const endTime = Date.now() + 5 * 60 * 1000; // 5 minutes

      // Save new timer state
      await chrome.storage.local.set({
        [hostname]: {
          isActive: true,
          endTime: endTime,
          totalMs: 5 * 60 * 1000,
        },
      });

      // Create new alarm
      await chrome.alarms.create(`timer_${hostname}`, {
        when: endTime,
      });

      modal.remove();
    });

  document.getElementById("refocus-dismiss").addEventListener("click", () => {
    modal.remove();
  });

  // Allow clicking overlay to dismiss
  modal.querySelector(".refocus-overlay").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) {
      modal.remove();
    }
  });

  // Handle escape key
  const handleEscape = (e) => {
    if (e.key === "Escape") {
      modal.remove();
      document.removeEventListener("keydown", handleEscape);
    }
  };
  document.addEventListener("keydown", handleEscape);
}

// Check for existing active timer when page loads
window.addEventListener("load", async () => {
  const hostname = window.location.hostname;
  const result = await chrome.storage.local.get([hostname]);
  const siteData = result[hostname];

  if (siteData && siteData.isActive) {
    const remaining = siteData.endTime - Date.now();
    if (remaining <= 0) {
      // Timer expired while page was loading
      showTimeUpModal();
      await chrome.storage.local.remove(hostname);
    }
  }
});

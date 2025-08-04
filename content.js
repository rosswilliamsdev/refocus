console.log("reFocus content script loaded on:", window.location.hostname);

// Clean hostname to remove protocols, www, etc.
function cleanHostname(input) {
  let hostname = input.trim().toLowerCase();

  // Remove protocol if present
  hostname = hostname.replace(/^https?:\/\//, "");

  // Remove www. if present
  hostname = hostname.replace(/^www\./, "");

  // Remove path, query params, etc.
  hostname = hostname.split("/")[0];
  hostname = hostname.split("?")[0];
  hostname = hostname.split("#")[0];

  return hostname;
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Content script received message:", message);
  if (message.type === "TIMER_EXPIRED") {
    console.log("Timer expired, showing modal");
    showTimeUpModal().catch(console.error);
    sendResponse({ success: true });
  }
  return true; // Keep message channel open for async response
});

function injectModalStyles() {
  const style = document.createElement("style");
  style.id = "refocus-styles";
  style.textContent = `
    .refocus-overlay {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      background: rgba(0, 0, 0, 0.7) !important;
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      z-index: 2147483647 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    }

    .refocus-modal {
      background: white !important;
      border-radius: 12px !important;
      padding: 0 !important;
      max-width: 400px !important;
      width: 90% !important;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1) !important;
      animation: refocus-slide-in 0.3s ease-out !important;
    }

    @keyframes refocus-slide-in {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .refocus-header {
      background: #2563eb !important;
      color: white !important;
      padding: 20px !important;
      border-radius: 12px 12px 0 0 !important;
      text-align: center !important;
    }

    .refocus-header h2 {
      margin: 0 !important;
      font-size: 24px !important;
      font-weight: 600 !important;
      color: white !important;
    }

    .refocus-body {
      padding: 24px !important;
      text-align: center !important;
    }

    .refocus-body p {
      margin: 0 !important;
      font-size: 16px !important;
      line-height: 1.5 !important;
      color: #374151 !important;
    }

    .refocus-buttons {
      padding: 0 24px 24px !important;
      display: flex !important;
      gap: 12px !important;
      flex-direction: column !important;
    }

    .refocus-btn {
      padding: 12px 24px !important;
      border: none !important;
      border-radius: 8px !important;
      font-size: 16px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
    }

    .refocus-primary {
      background: #2563eb !important;
      color: white !important;
    }

    .refocus-primary:hover {
      background: #1d4ed8 !important;
      transform: translateY(-1px) !important;
    }

    .refocus-secondary {
      background: #f3f4f6 !important;
      color: #374151 !important;
      border: 1px solid #d1d5db !important;
    }

    .refocus-secondary:hover {
      background: #e5e7eb !important;
      transform: translateY(-1px) !important;
    }
  `;
  document.head.appendChild(style);
}

async function showTimeUpModal() {
  // Remove any existing modal
  const existingModal = document.getElementById("refocus-modal");
  if (existingModal) {
    existingModal.remove();
  }

  // Inject CSS styles if not already present
  if (!document.getElementById("refocus-styles")) {
    injectModalStyles();
  }

  // Create modal elements without innerHTML to avoid CSP issues
  const modal = document.createElement("div");
  modal.id = "refocus-modal";

  const overlay = document.createElement("div");
  overlay.className = "refocus-overlay";

  const modalContent = document.createElement("div");
  modalContent.className = "refocus-modal";

  const header = document.createElement("div");
  header.className = "refocus-header";
  const headerText = document.createElement("h2");
  headerText.textContent = "🎯 Time to reFocus!";
  header.appendChild(headerText);

  const body = document.createElement("div");
  body.className = "refocus-body";
  const bodyText = document.createElement("p");
  bodyText.textContent =
    "Your time is up! Reset the timer for more time or move on to your next task.";
  body.appendChild(bodyText);

  const buttons = document.createElement("div");
  buttons.className = "refocus-buttons";

  // Get saved timer settings for reset button text
  const rawHostname = window.location.hostname;
  const cleanedHostname = cleanHostname(rawHostname);
  const timerSettings = await getTimerForSite(cleanedHostname);
  
  const resetButton = document.createElement("button");
  resetButton.id = "refocus-reset";
  resetButton.className = "refocus-btn refocus-primary";
  
  // Display the actual timer duration in the button
  if (timerSettings.minutes > 0) {
    resetButton.textContent = `Reset Timer (${timerSettings.minutes}m ${timerSettings.seconds}s)`;
  } else {
    resetButton.textContent = `Reset Timer (${timerSettings.seconds}s)`;
  }

  const dismissButton = document.createElement("button");
  dismissButton.id = "refocus-dismiss";
  dismissButton.className = "refocus-btn refocus-secondary";
  dismissButton.textContent = "Move On";

  buttons.appendChild(resetButton);
  buttons.appendChild(dismissButton);

  modalContent.appendChild(header);
  modalContent.appendChild(body);
  modalContent.appendChild(buttons);

  overlay.appendChild(modalContent);
  modal.appendChild(overlay);

  // Add modal to body
  document.body.appendChild(modal);

  // Add event listeners
  document
    .getElementById("refocus-reset")
    .addEventListener("click", async () => {
      // Use saved timer settings instead of default
      const duration = (timerSettings.minutes * 60 + timerSettings.seconds) * 1000;
      const endTime = Date.now() + duration;

      // Save new timer state using cleaned hostname
      await chrome.storage.local.set({
        [cleanedHostname]: {
          isActive: true,
          endTime: endTime,
          totalMs: duration,
        },
      });

      // Create new alarm
      await chrome.alarms.create(`timer_${cleanedHostname}`, {
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

// Storage keys
const SITES_LIST_KEY = "refocus_sites_list";
const TIMER_SETTINGS_KEY = "refocus_timer_settings";

// Get saved timer values for a site (or defaults)
async function getTimerForSite(hostname) {
  const result = await chrome.storage.local.get([TIMER_SETTINGS_KEY]);
  const settings = result[TIMER_SETTINGS_KEY] || {};
  return settings[hostname] || { minutes: 0, seconds: 4 };
}

// Check if current site is in managed sites list
async function isSiteManaged() {
  const result = await chrome.storage.local.get([SITES_LIST_KEY]);
  const sitesList = result[SITES_LIST_KEY] || [];

  const cleanedCurrentHostname = cleanHostname(window.location.hostname);
  return sitesList.some(
    (hostname) =>
      hostname === cleanedCurrentHostname ||
      cleanedCurrentHostname.includes(hostname) ||
      hostname.includes(cleanedCurrentHostname)
  );
}

// Start automatic timer for current site
async function startAutomaticTimer() {
  const cleanedHostname = cleanHostname(window.location.hostname);

  // Check if there's already an active timer
  const result = await chrome.storage.local.get([cleanedHostname]);
  if (result[cleanedHostname] && result[cleanedHostname].isActive) {
    console.log("Timer already active for", cleanedHostname);
    return;
  }

  // Get saved timer settings for this site
  const timerSettings = await getTimerForSite(cleanedHostname);
  const duration = (timerSettings.minutes * 60 + timerSettings.seconds) * 1000;

  // Send message to background script to start timer
  try {
    const response = await chrome.runtime.sendMessage({
      type: "START_TIMER",
      hostname: cleanedHostname,
      duration: duration,
    });
    console.log(
      "Auto-started timer for",
      cleanedHostname,
      "with duration:",
      duration + "ms",
      "response:",
      response
    );
  } catch (error) {
    console.error("Failed to start automatic timer:", error);
  }
}

// Stop and reset timer for current site
async function stopAutomaticTimer() {
  const cleanedHostname = cleanHostname(window.location.hostname);

  // Send message to background script to stop timer
  try {
    const response = await chrome.runtime.sendMessage({
      type: "STOP_TIMER",
      hostname: cleanedHostname,
    });
    console.log(
      "Auto-stopped timer for",
      cleanedHostname,
      "response:",
      response
    );
  } catch (error) {
    console.error("Failed to stop automatic timer:", error);
  }
}

// Check for existing active timer when page loads and start automatic timer
window.addEventListener("load", async () => {
  const hostname = window.location.hostname;
  const cleanedHostname = cleanHostname(hostname);
  console.log("Page loaded - checking timer for:", cleanedHostname);

  const result = await chrome.storage.local.get([cleanedHostname]);
  const siteData = result[cleanedHostname];
  console.log("Existing timer data:", siteData);

  if (siteData && siteData.isActive) {
    const remaining = siteData.endTime - Date.now();
    console.log("Active timer found, remaining:", remaining);
    if (remaining <= 0) {
      // Timer expired while page was loading
      console.log("Timer expired, showing modal");
      showTimeUpModal().catch(console.error);
      await chrome.storage.local.remove(cleanedHostname);
    }
  } else {
    const isManaged = await isSiteManaged();
    console.log("Site managed status:", isManaged);
    if (isManaged) {
      // Site is managed but no active timer - start automatic timer
      console.log("Starting automatic timer");
      await startAutomaticTimer();
    } else {
      console.log("Site not managed, no automatic timer");
    }
  }
});

// Handle page visibility changes (tab switching, minimizing)
document.addEventListener("visibilitychange", async () => {
  if (await isSiteManaged()) {
    if (document.hidden) {
      // Page became hidden - stop timer
      await stopAutomaticTimer();
    } else {
      // Page became visible - start timer
      await startAutomaticTimer();
    }
  }
});

// Handle beforeunload (navigating away or closing tab)
window.addEventListener("beforeunload", async () => {
  if (await isSiteManaged()) {
    await stopAutomaticTimer();
  }
});

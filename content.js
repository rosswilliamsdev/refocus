console.log("reFocus content script loaded on:", window.location.hostname);

// Global variable to store the modal keyboard handler
let modalKeydownHandler = null;

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

function restoreBackgroundInteraction() {
  // Re-enable body scrolling
  document.body.style.overflow = '';
  document.documentElement.style.overflow = '';
  
  // Re-enable pointer events and remove inert attribute from background elements
  const allElements = document.querySelectorAll('body > *:not(#refocus-modal)');
  allElements.forEach(element => {
    element.removeAttribute('inert');
    element.style.pointerEvents = '';
  });
  
  // Remove the modal keyboard event listener
  if (modalKeydownHandler) {
    document.removeEventListener('keydown', modalKeydownHandler, true);
    modalKeydownHandler = null;
  }
}

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
      pointer-events: auto !important;
      overflow: hidden !important;
    }

    .refocus-modal {
      background: white !important;
      border-radius: 12px !important;
      padding: 0 !important;
      max-width: 400px !important;
      width: 90% !important;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1) !important;
      animation: refocus-slide-in 0.3s ease-out !important;
      position: relative !important;
      pointer-events: auto !important;
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
    restoreBackgroundInteraction();
    existingModal.remove();
  }

  // Inject CSS styles if not already present
  if (!document.getElementById("refocus-styles")) {
    injectModalStyles();
  }

  // Get hostname and settings
  const rawHostname = window.location.hostname;
  const cleanedHostname = cleanHostname(rawHostname);
  const timerSettings = await getTimerForSite(cleanedHostname);
  const cooldownSettings = await getCooldownForSite(cleanedHostname);
  
  // Only start cooldown if not already in cooldown (i.e., timer just expired)
  const alreadyInCooldown = await isSiteInCooldown(cleanedHostname);
  if (!alreadyInCooldown) {
    await startCooldown(cleanedHostname);
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
  bodyText.id = "refocus-body-text";
  bodyText.textContent = "Your time is up! Starting cooldown...";
  body.appendChild(bodyText);

  // Add cooldown display
  const cooldownDisplay = document.createElement("div");
  cooldownDisplay.id = "refocus-cooldown-display";
  cooldownDisplay.style.cssText = "font-size: 18px; font-weight: bold; margin: 10px 0; color: #dc2626;";
  body.appendChild(cooldownDisplay);

  // Add timer settings controls (initially hidden during cooldown)
  const timerSettingsDiv = document.createElement("div");
  timerSettingsDiv.id = "refocus-timer-settings";
  timerSettingsDiv.style.cssText = "display: none; margin: 20px 0; text-align: center;";
  
  const settingsTitle = document.createElement("h3");
  settingsTitle.textContent = "Timer Settings";
  settingsTitle.style.cssText = "margin: 0 0 15px 0; color: #374151; font-size: 16px;";
  timerSettingsDiv.appendChild(settingsTitle);
  
  const inputRow = document.createElement("div");
  inputRow.style.cssText = "display: flex; justify-content: center; align-items: center; gap: 10px; margin-bottom: 15px;";
  
  // Minutes input
  const minutesLabel = document.createElement("label");
  minutesLabel.textContent = "Minutes:";
  minutesLabel.style.cssText = "font-size: 14px; color: #374151;";
  
  const minutesInput = document.createElement("input");
  minutesInput.type = "number";
  minutesInput.id = "refocus-minutes";
  minutesInput.min = "0";
  minutesInput.max = "999";
  minutesInput.value = timerSettings.minutes;
  minutesInput.style.cssText = "width: 60px; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; text-align: center;";
  
  // Seconds input
  const secondsLabel = document.createElement("label");
  secondsLabel.textContent = "Seconds:";
  secondsLabel.style.cssText = "font-size: 14px; color: #374151;";
  
  const secondsInput = document.createElement("input");
  secondsInput.type = "number";
  secondsInput.id = "refocus-seconds";
  secondsInput.min = "0";
  secondsInput.max = "59";
  secondsInput.value = timerSettings.seconds;
  secondsInput.style.cssText = "width: 60px; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; text-align: center;";
  
  inputRow.appendChild(minutesLabel);
  inputRow.appendChild(minutesInput);
  inputRow.appendChild(secondsLabel);
  inputRow.appendChild(secondsInput);
  timerSettingsDiv.appendChild(inputRow);
  
  // Add cooldown settings section
  const cooldownTitle = document.createElement("h4");
  cooldownTitle.textContent = "Cooldown Time";
  cooldownTitle.style.cssText = "margin: 15px 0 10px 0; color: #374151; font-size: 14px;";
  timerSettingsDiv.appendChild(cooldownTitle);
  
  const cooldownRow = document.createElement("div");
  cooldownRow.style.cssText = "display: flex; justify-content: center; align-items: center; gap: 10px; margin-bottom: 15px;";
  
  // Cooldown minutes input
  const cooldownMinutesLabel = document.createElement("label");
  cooldownMinutesLabel.textContent = "Minutes:";
  cooldownMinutesLabel.style.cssText = "font-size: 14px; color: #374151;";
  
  const cooldownMinutesInput = document.createElement("input");
  cooldownMinutesInput.type = "number";
  cooldownMinutesInput.id = "refocus-cooldown-minutes";
  cooldownMinutesInput.min = "0";
  cooldownMinutesInput.max = "999";
  cooldownMinutesInput.value = cooldownSettings.minutes;
  cooldownMinutesInput.style.cssText = "width: 60px; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; text-align: center;";
  
  // Cooldown seconds input
  const cooldownSecondsLabel = document.createElement("label");
  cooldownSecondsLabel.textContent = "Seconds:";
  cooldownSecondsLabel.style.cssText = "font-size: 14px; color: #374151;";
  
  const cooldownSecondsInput = document.createElement("input");
  cooldownSecondsInput.type = "number";
  cooldownSecondsInput.id = "refocus-cooldown-seconds";
  cooldownSecondsInput.min = "0";
  cooldownSecondsInput.max = "59";
  cooldownSecondsInput.value = cooldownSettings.seconds;
  cooldownSecondsInput.style.cssText = "width: 60px; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; text-align: center;";
  
  cooldownRow.appendChild(cooldownMinutesLabel);
  cooldownRow.appendChild(cooldownMinutesInput);
  cooldownRow.appendChild(cooldownSecondsLabel);
  cooldownRow.appendChild(cooldownSecondsInput);
  timerSettingsDiv.appendChild(cooldownRow);
  
  body.appendChild(timerSettingsDiv);

  const buttons = document.createElement("div");
  buttons.className = "refocus-buttons";
  
  const startButton = document.createElement("button");
  startButton.id = "refocus-start";
  startButton.className = "refocus-btn refocus-primary";
  startButton.disabled = true; // Initially disabled during cooldown
  startButton.style.opacity = "0.5";
  startButton.textContent = "Start Timer";

  buttons.appendChild(startButton);

  modalContent.appendChild(header);
  modalContent.appendChild(body);
  modalContent.appendChild(buttons);

  overlay.appendChild(modalContent);
  modal.appendChild(overlay);

  // Add modal to body
  document.body.appendChild(modal);

  // Prevent background interaction by disabling body scroll and pointer events
  document.body.style.overflow = 'hidden';
  document.documentElement.style.overflow = 'hidden';
  
  // Prevent tabbing to background elements
  const allElements = document.querySelectorAll('body > *:not(#refocus-modal)');
  allElements.forEach(element => {
    element.setAttribute('inert', '');
    element.style.pointerEvents = 'none';
  });

  // Add keyboard event listeners to prevent modal dismissal
  modalKeydownHandler = (e) => {
    // Prevent escape key from closing modal
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    
    // Trap focus within modal
    if (e.key === 'Tab') {
      const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];
      
      if (e.shiftKey && document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      } else if (!e.shiftKey && document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  };
  
  // Add event listener for keyboard interactions
  document.addEventListener('keydown', modalKeydownHandler, true);

  // Start cooldown countdown
  updateCooldownDisplay(cleanedHostname);

  // Add event listeners
  document.getElementById("refocus-start").addEventListener("click", async () => {
    console.log("Start timer button clicked");
    
    // Check if cooldown is still active
    const inCooldown = await isSiteInCooldown(cleanedHostname);
    if (inCooldown) {
      console.log("Still in cooldown, not starting timer");
      return; // Don't allow start during cooldown
    }

    try {
      // Get timer values from inputs
      const minutes = parseInt(document.getElementById("refocus-minutes").value) || 0;
      const seconds = parseInt(document.getElementById("refocus-seconds").value) || 0;
      
      if (minutes === 0 && seconds === 0) {
        alert("Please enter a valid timer duration");
        return;
      }

      const duration = (minutes * 60 + seconds) * 1000;

      // Get cooldown values from inputs
      const cooldownMinutes = parseInt(document.getElementById("refocus-cooldown-minutes").value) || 0;
      const cooldownSeconds = parseInt(document.getElementById("refocus-cooldown-seconds").value) || 0;

      // Save the new timer settings for this site
      const timerResult = await chrome.storage.local.get([TIMER_SETTINGS_KEY]);
      const timerSettings = timerResult[TIMER_SETTINGS_KEY] || {};
      timerSettings[cleanedHostname] = { minutes, seconds };
      await chrome.storage.local.set({ [TIMER_SETTINGS_KEY]: timerSettings });
      
      // Save the new cooldown settings for this site
      const cooldownResult = await chrome.storage.local.get([COOLDOWN_SETTINGS_KEY]);
      const cooldownSettings = cooldownResult[COOLDOWN_SETTINGS_KEY] || {};
      cooldownSettings[cleanedHostname] = { minutes: cooldownMinutes, seconds: cooldownSeconds };
      await chrome.storage.local.set({ [COOLDOWN_SETTINGS_KEY]: cooldownSettings });

      // Send message to background script to start timer
      const response = await chrome.runtime.sendMessage({
        type: "START_TIMER",
        hostname: cleanedHostname,
        duration: duration,
      });

      if (response && response.success) {
        console.log("Timer started successfully via background script, closing modal");
      } else {
        console.error("Failed to start timer via background script");
      }
      
      restoreBackgroundInteraction();
      
      // Use both the variable reference and DOM query to ensure removal
      if (modal && modal.parentNode) {
        modal.remove();
        console.log("Modal removed via variable reference");
      }
      
      // Also try removing by ID as fallback
      const modalById = document.getElementById("refocus-modal");
      if (modalById) {
        modalById.remove();
        console.log("Modal removed via ID query");
      }
    } catch (error) {
      console.error("Error starting timer:", error);
      // Still try to close modal even if timer start fails
      restoreBackgroundInteraction();
      
      // Try both removal methods in error case too
      if (modal && modal.parentNode) {
        modal.remove();
      }
      const modalById = document.getElementById("refocus-modal");
      if (modalById) {
        modalById.remove();
      }
    }
  });

  // No dismiss functionality - modal cannot be closed until cooldown is over
  // Remove all event listeners that would allow closing the modal
}

// Update cooldown display in real-time
async function updateCooldownDisplay(hostname) {
  const cooldownKey = `cooldown_${hostname}`;
  const bodyText = document.getElementById("refocus-body-text");
  const cooldownDisplay = document.getElementById("refocus-cooldown-display");
  const startButton = document.getElementById("refocus-start");
  const timerSettingsDiv = document.getElementById("refocus-timer-settings");
  
  if (!cooldownDisplay || !bodyText || !startButton || !timerSettingsDiv) {
    return; // Modal was closed
  }

  const result = await chrome.storage.local.get([cooldownKey]);
  const cooldownData = result[cooldownKey];
  
  if (!cooldownData || !cooldownData.endTime) {
    // No cooldown active - show timer settings
    bodyText.textContent = "Your time is up! Set a new timer to continue.";
    cooldownDisplay.textContent = "";
    cooldownDisplay.style.display = "none";
    timerSettingsDiv.style.display = "block";
    startButton.disabled = false;
    startButton.style.opacity = "1";
    
    // Focus the minutes input when settings become available
    const minutesInput = document.getElementById("refocus-minutes");
    if (minutesInput) {
      minutesInput.focus();
      minutesInput.select();
    }
    return;
  }

  const remaining = cooldownData.endTime - Date.now();
  
  if (remaining <= 0) {
    // Cooldown finished - show timer settings
    bodyText.textContent = "Cooldown complete! Set a new timer to continue.";
    cooldownDisplay.textContent = "";
    cooldownDisplay.style.display = "none";
    timerSettingsDiv.style.display = "block";
    startButton.disabled = false;
    startButton.style.opacity = "1";
    
    // Focus the minutes input when cooldown completes
    const minutesInput = document.getElementById("refocus-minutes");
    if (minutesInput) {
      minutesInput.focus();
      minutesInput.select();
    }
    
    // Clean up cooldown storage
    await chrome.storage.local.remove(cooldownKey);
    return;
  }

  // Cooldown still active
  const seconds = Math.ceil(remaining / 1000);
  bodyText.textContent = "Your time is up! Please wait for the cooldown to finish.";
  cooldownDisplay.textContent = `Cooldown: ${seconds}s`;
  cooldownDisplay.style.display = "block";
  timerSettingsDiv.style.display = "none";
  startButton.disabled = true;
  startButton.style.opacity = "0.5";

  // Continue updating every second
  setTimeout(() => updateCooldownDisplay(hostname), 1000);
}

// Storage keys
const SITES_LIST_KEY = "refocus_sites_list";
const TIMER_SETTINGS_KEY = "refocus_timer_settings";
const COOLDOWN_SETTINGS_KEY = "refocus_cooldown_settings";

// Get saved timer values for a site (or defaults)
async function getTimerForSite(hostname) {
  const result = await chrome.storage.local.get([TIMER_SETTINGS_KEY]);
  const settings = result[TIMER_SETTINGS_KEY] || {};
  return settings[hostname] || { minutes: 5, seconds: 0 };
}

// Get saved cooldown values for a site (or defaults)
async function getCooldownForSite(hostname) {
  const result = await chrome.storage.local.get([COOLDOWN_SETTINGS_KEY]);
  const settings = result[COOLDOWN_SETTINGS_KEY] || {};
  return settings[hostname] || { minutes: 0, seconds: 20 };
}

// Check if site is in cooldown
async function isSiteInCooldown(hostname) {
  const cooldownKey = `cooldown_${hostname}`;
  const result = await chrome.storage.local.get([cooldownKey]);
  const cooldownData = result[cooldownKey];
  
  if (!cooldownData || !cooldownData.endTime) {
    return false;
  }
  
  const now = Date.now();
  return now < cooldownData.endTime;
}

// Start cooldown for a site
async function startCooldown(hostname) {
  const cooldownSettings = await getCooldownForSite(hostname);
  const cooldownMs = (cooldownSettings.minutes * 60 + cooldownSettings.seconds) * 1000;
  const endTime = Date.now() + cooldownMs;
  
  const cooldownKey = `cooldown_${hostname}`;
  await chrome.storage.local.set({
    [cooldownKey]: {
      isActive: true,
      endTime: endTime,
      totalMs: cooldownMs,
    },
  });
  
  console.log(`Started cooldown for ${hostname}, duration: ${cooldownMs}ms`);
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

  // Check if site is in cooldown
  const inCooldown = await isSiteInCooldown(cleanedHostname);
  if (inCooldown) {
    console.log("Site is in cooldown, not starting timer for", cleanedHostname);
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

  // First check if there's an active cooldown
  const inCooldown = await isSiteInCooldown(cleanedHostname);
  if (inCooldown) {
    console.log("Site is in cooldown, showing modal");
    showTimeUpModal().catch(console.error);
    return; // Don't check for timers or start new ones during cooldown
  }

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
    const cleanedHostname = cleanHostname(window.location.hostname);
    
    if (document.hidden) {
      // Page became hidden - pause timer
      await chrome.runtime.sendMessage({
        type: "PAUSE_TIMER",
        hostname: cleanedHostname,
      });
      console.log("Timer paused for", cleanedHostname);
    } else {
      // Page became visible - resume timer
      await chrome.runtime.sendMessage({
        type: "RESUME_TIMER",
        hostname: cleanedHostname,
      });
      console.log("Timer resumed for", cleanedHostname);
    }
  }
});

// Handle beforeunload (navigating away or closing tab)
window.addEventListener("beforeunload", async () => {
  if (await isSiteManaged()) {
    await stopAutomaticTimer();
  }
});

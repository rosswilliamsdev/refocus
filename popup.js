document.addEventListener("DOMContentLoaded", async () => {
  const currentSiteEl = document.getElementById("currentSite");
  const addCurrentSiteBtn = document.getElementById("addCurrentSite");
  const manageTimersBtn = document.getElementById("manageTimersBtn");
  const currentSiteTimer = document.getElementById("currentSiteTimer");
  const siteNotManaged = document.getElementById("siteNotManaged");
  
  // Global timer elements
  const globalTimerHeader = document.getElementById("globalTimerHeader");
  const globalTimerContent = document.getElementById("globalTimerContent");
  const globalChevron = document.getElementById("globalChevron");
  const globalMinutesEl = document.getElementById("globalMinutes");
  const globalSecondsEl = document.getElementById("globalSeconds");
  const globalCooldownMinutesEl = document.getElementById("globalCooldownMinutes");
  const globalCooldownSecondsEl = document.getElementById("globalCooldownSeconds");
  const startGlobalTimerBtn = document.getElementById("startGlobalTimer");
  const stopGlobalTimerBtn = document.getElementById("stopGlobalTimer");
  const globalStatusEl = document.getElementById("globalStatus");

  let currentHostname = "";
  let siteTimers = {}; // Store timer intervals for each site

  // Storage keys
  const SITES_LIST_KEY = "refocus_sites_list";
  const TIMER_SETTINGS_KEY = "refocus_timer_settings";
  const COOLDOWN_SETTINGS_KEY = "refocus_cooldown_settings";

  // Get current active tab's hostname
  async function getCurrentSite() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab && tab.url) {
        const url = new URL(tab.url);
        currentHostname = url.hostname;
        currentSiteEl.textContent = currentHostname;
      } else {
        currentSiteEl.textContent = "No active tab";
      }
    } catch (error) {
      currentSiteEl.textContent = "Unable to detect site";
      console.error("Error getting current site:", error);
    }
  }

  // Load sites list from storage
  async function loadSitesList() {
    const result = await chrome.storage.local.get([SITES_LIST_KEY]);
    const sitesList = result[SITES_LIST_KEY] || [];

    // Also load timer data for each site
    if (sitesList.length > 0) {
      const siteData = await chrome.storage.local.get(sitesList);
      return sitesList.map((hostname) => ({
        hostname,
        timerData: siteData[hostname] || null,
      }));
    }

    return [];
  }

  // Save sites list to storage
  async function saveSitesList(sites) {
    const hostnameList = sites.map((site) => site.hostname);
    await chrome.storage.local.set({ [SITES_LIST_KEY]: hostnameList });
  }

  // Load timer settings from storage
  async function loadTimerSettings() {
    const result = await chrome.storage.local.get([TIMER_SETTINGS_KEY]);
    return result[TIMER_SETTINGS_KEY] || {};
  }

  // Save timer settings to storage
  async function saveTimerSettings(settings) {
    await chrome.storage.local.set({ [TIMER_SETTINGS_KEY]: settings });
  }

  // Save timer values for a specific site
  async function saveTimerForSite(hostname, minutes, seconds) {
    console.log("Popup - Saving timer for site:", hostname, "values:", {
      minutes,
      seconds,
    });
    const settings = await loadTimerSettings();
    settings[hostname] = { minutes, seconds };
    await saveTimerSettings(settings);
    console.log("Popup - Updated settings:", settings);
  }

  // Get saved timer values for a site (or defaults)
  async function getTimerForSite(hostname) {
    const settings = await loadTimerSettings();
    const result = settings[hostname] || { minutes: 5, seconds: 0 };
    console.log(
      "Popup - Loading timer for site:",
      hostname,
      "result:",
      result,
      "from settings:",
      settings
    );
    return result;
  }

  // Load cooldown settings from storage
  async function loadCooldownSettings() {
    const result = await chrome.storage.local.get([COOLDOWN_SETTINGS_KEY]);
    return result[COOLDOWN_SETTINGS_KEY] || {};
  }

  // Save cooldown settings to storage
  async function saveCooldownSettings(settings) {
    await chrome.storage.local.set({ [COOLDOWN_SETTINGS_KEY]: settings });
  }

  // Save cooldown values for a specific site
  async function saveCooldownForSite(hostname, minutes, seconds) {
    console.log("Popup - Saving cooldown for site:", hostname, "values:", {
      minutes,
      seconds,
    });
    const settings = await loadCooldownSettings();
    settings[hostname] = { minutes, seconds };
    await saveCooldownSettings(settings);
    console.log("Popup - Updated cooldown settings:", settings);
  }

  // Get saved cooldown values for a site (or defaults)
  async function getCooldownForSite(hostname) {
    const settings = await loadCooldownSettings();
    const result = settings[hostname] || { minutes: 0, seconds: 20 };
    console.log(
      "Popup - Loading cooldown for site:",
      hostname,
      "result:",
      result,
      "from settings:",
      settings
    );
    return result;
  }

  // Add site to the list
  async function addSite(hostname) {
    if (!hostname) return;

    // Clean hostname (remove www., protocols, etc.)
    hostname = cleanHostname(hostname);

    const sites = await loadSitesList();

    // Check if site already exists
    if (sites.some((site) => site.hostname === hostname)) {
      showTemporaryMessage("Site already in list!");
      return;
    }

    sites.push({ hostname, timerData: null });
    await saveSitesList(sites);
    await renderCurrentSiteTimer(true); // Force render after adding site
    showTemporaryMessage("Site added!");
  }

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

  // Start timer for a site
  async function startTimer(hostname, minutes, seconds) {
    const totalMs = (minutes * 60 + seconds) * 1000;
    if (totalMs <= 0) return;

    // Send message to background script to start timer (using new pause/resume system)
    try {
      const response = await chrome.runtime.sendMessage({
        type: "START_TIMER",
        hostname: hostname,
        duration: totalMs,
      });
      
      if (response && response.success) {
        console.log("Timer started via background script");
      } else {
        console.error("Failed to start timer via background script");
      }
    } catch (error) {
      console.error("Error starting timer:", error);
    }

    await renderCurrentSiteTimer(true); // Force render after timer state changes
  }



  // Update timer display for a site
  function updateTimerDisplay(hostname, remainingMs) {
    const displayEl = document.getElementById(`display-${hostname}`);
    if (!displayEl) return;

    const totalSeconds = Math.floor(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    displayEl.textContent = `${minutes}:${seconds.toString().padStart(2, "0")}`;

    // Add warning class if less than 1 minute remaining
    if (remainingMs < 60000) {
      displayEl.classList.add("warning");
    } else {
      displayEl.classList.remove("warning");
    }
  }

  // Start countdown for a site
  function startCountdown(hostname, remainingMs) {
    // Clear existing interval
    if (siteTimers[hostname]) {
      clearInterval(siteTimers[hostname]);
    }

    updateTimerDisplay(hostname, remainingMs);

    siteTimers[hostname] = setInterval(async () => {
      const result = await chrome.storage.local.get([hostname]);
      const siteData = result[hostname];

      if (siteData && siteData.isActive) {
        // Use remainingMs from new timer structure, accounting for elapsed time if not paused
        let remaining = siteData.remainingMs;
        
        if (!siteData.isPaused && siteData.lastUpdate) {
          const elapsed = Date.now() - siteData.lastUpdate;
          remaining = Math.max(0, remaining - elapsed);
        }
        
        if (remaining > 0) {
          updateTimerDisplay(hostname, remaining);
        } else {
          updateTimerDisplay(hostname, 0);
          // Timer expired - background script will handle it
          // Just update the UI after a short delay
          setTimeout(() => renderCurrentSiteTimer(), 1000);
        }
      } else {
        // Timer was stopped
        clearInterval(siteTimers[hostname]);
        delete siteTimers[hostname];
        renderCurrentSiteTimer();
      }
    }, 1000);
  }


  // Render a single site item
  async function createSiteElement(site) {
    const { hostname, timerData } = site;
    const isActive = timerData && timerData.isActive;
    let remainingMs = 0;
    
    if (isActive) {
      remainingMs = timerData.remainingMs || 0;
      // Account for elapsed time if not paused
      if (!timerData.isPaused && timerData.lastUpdate) {
        const elapsed = Date.now() - timerData.lastUpdate;
        remainingMs = Math.max(0, remainingMs - elapsed);
      }
    }

    // Get saved timer and cooldown values for this site
    const savedTimer = await getTimerForSite(hostname);
    const savedCooldown = await getCooldownForSite(hostname);

    const siteEl = document.createElement("div");
    siteEl.className = "site-item";
    siteEl.innerHTML = `
      <div class="site-header">
        <div class="site-name">${hostname}</div>
      </div>
      
      <div class="site-timer">
        ${
          isActive && remainingMs > 0
            ? `
          <div class="site-timer-display" id="display-${hostname}">
            ${Math.floor(remainingMs / 60000)}:${Math.floor(
                (remainingMs % 60000) / 1000
              )
                .toString()
                .padStart(2, "0")}
          </div>
          <div class="site-status">Timer active</div>
        `
            : `
          <div class="timer-section">
            <div class="timer-label"><strong>Timer</strong></div>
            <div class="timer-input-row">
              <label>Min:</label>
              <input type="number" id="minutes-${hostname}" min="0" max="999" value="${savedTimer.minutes}" />
              <label>Sec:</label>
              <input type="number" id="seconds-${hostname}" min="0" max="59" value="${savedTimer.seconds}" />
            </div>
          </div>
          <div class="timer-section">
            <div class="timer-label"><strong>Cooldown</strong></div>
            <div class="timer-input-row">
              <label>Min:</label>
              <input type="number" id="cooldown-minutes-${hostname}" min="0" max="999" value="${savedCooldown.minutes}" />
              <label>Sec:</label>
              <input type="number" id="cooldown-seconds-${hostname}" min="0" max="59" value="${savedCooldown.seconds}" />
            </div>
          </div>
          <div class="timer-controls">
            <button class="start-btn" data-hostname="${hostname}">Start Timer</button>
            <button class="save-btn" data-hostname="${hostname}">Save Settings</button>
          </div>
        `
        }
      </div>
    `;

    // Add event listeners to buttons
    const startBtn = siteEl.querySelector(".start-btn");
    const saveBtn = siteEl.querySelector(".save-btn");

    if (startBtn) {
      startBtn.addEventListener("click", async () => {
        const minutesEl = document.getElementById(`minutes-${hostname}`);
        const secondsEl = document.getElementById(`seconds-${hostname}`);

        const minutes = parseInt(minutesEl.value) || 0;
        const seconds = parseInt(secondsEl.value) || 0;

        if (minutes === 0 && seconds === 0) {
          showTemporaryMessage("Please enter a valid time");
          return;
        }

        // Save the timer values before starting the timer
        await saveTimerForSite(hostname, minutes, seconds);

        await startTimer(hostname, minutes, seconds);
      });
    }


    // Add save button event listener
    if (saveBtn) {
      saveBtn.addEventListener("click", async () => {
        const minutesEl = document.getElementById(`minutes-${hostname}`);
        const secondsEl = document.getElementById(`seconds-${hostname}`);

        if (minutesEl && secondsEl) {
          const minutes = parseInt(minutesEl.value) || 0;
          const seconds = parseInt(secondsEl.value) || 0;
          await saveTimerForSite(hostname, minutes, seconds);
        }

        const cooldownMinutesEl = document.getElementById(
          `cooldown-minutes-${hostname}`
        );
        const cooldownSecondsEl = document.getElementById(
          `cooldown-seconds-${hostname}`
        );

        if (cooldownMinutesEl && cooldownSecondsEl) {
          // Get current saved values to use as fallback
          const currentCooldown = await getCooldownForSite(hostname);
          const cooldownMinutes =
            parseInt(cooldownMinutesEl.value) || currentCooldown.minutes;
          const cooldownSeconds =
            parseInt(cooldownSecondsEl.value) || currentCooldown.seconds;
          await saveCooldownForSite(hostname, cooldownMinutes, cooldownSeconds);
        }

        showTemporaryMessage(`Settings saved for ${hostname}!`);
      });
    }

    return siteEl;
  }

  // Preserve input values and focus state before re-rendering
  function preserveCurrentSiteInputValues() {
    const inputValues = {};
    let focusedElementId = null;
    let cursorPosition = null;

    // Capture which element has focus and cursor position
    if (document.activeElement && document.activeElement.tagName === "INPUT") {
      focusedElementId = document.activeElement.id;
      cursorPosition = document.activeElement.selectionStart;
    }

    const minutesInput = currentSiteTimer.querySelector(
      'input[id^="minutes-"]'
    );
    const secondsInput = currentSiteTimer.querySelector(
      'input[id^="seconds-"]'
    );
    const cooldownMinutesInput = currentSiteTimer.querySelector(
      'input[id^="cooldown-minutes-"]'
    );
    const cooldownSecondsInput = currentSiteTimer.querySelector(
      'input[id^="cooldown-seconds-"]'
    );

    if (minutesInput) {
      inputValues[minutesInput.id] = minutesInput.value;
    }
    if (secondsInput) {
      inputValues[secondsInput.id] = secondsInput.value;
    }
    if (cooldownMinutesInput) {
      inputValues[cooldownMinutesInput.id] = cooldownMinutesInput.value;
    }
    if (cooldownSecondsInput) {
      inputValues[cooldownSecondsInput.id] = cooldownSecondsInput.value;
    }

    return { inputValues, focusedElementId, cursorPosition };
  }

  // Restore input values and focus state after re-rendering
  function restoreCurrentSiteInputValues(preservedState) {
    if (!preservedState) return;

    const { inputValues, focusedElementId, cursorPosition } = preservedState;

    // Restore input values
    Object.keys(inputValues).forEach((inputId) => {
      const input = document.getElementById(inputId);
      if (input) {
        input.value = inputValues[inputId];
      }
    });

    // Restore focus and cursor position
    if (focusedElementId) {
      const focusedElement = document.getElementById(focusedElementId);
      if (focusedElement) {
        focusedElement.focus();
        if (cursorPosition !== null) {
          focusedElement.setSelectionRange(cursorPosition, cursorPosition);
        }
      }
    }
  }

  // Check if user is currently editing inputs
  function isUserEditingInputs() {
    const activeElement = document.activeElement;
    return (
      activeElement &&
      activeElement.tagName === "INPUT" &&
      currentSiteTimer.contains(activeElement)
    );
  }

  // Render current site timer
  async function renderCurrentSiteTimer(forceRender = false) {
    if (!currentHostname) {
      currentSiteTimer.innerHTML =
        '<div class="no-current-site">Navigate to a website to see timer controls</div>';
      siteNotManaged.style.display = "none";
      return;
    }

    // Don't re-render if user is actively editing inputs (unless forced)
    if (!forceRender && isUserEditingInputs()) {
      return;
    }

    const sites = await loadSitesList();
    const cleanedCurrentHostname = cleanHostname(currentHostname);
    const currentSite = sites.find(
      (site) =>
        site.hostname === cleanedCurrentHostname ||
        cleanedCurrentHostname.includes(site.hostname) ||
        site.hostname.includes(cleanedCurrentHostname)
    );

    // Preserve current input values and focus before clearing
    const preservedState = preserveCurrentSiteInputValues();

    // Clear existing timer interval for current site
    if (siteTimers[currentHostname]) {
      clearInterval(siteTimers[currentHostname]);
      delete siteTimers[currentHostname];
    }

    if (!currentSite) {
      // Site is not managed
      currentSiteTimer.innerHTML = "";
      siteNotManaged.style.display = "block";
      return;
    }

    // Site is managed - show timer controls
    siteNotManaged.style.display = "none";
    const siteEl = await createSiteElement(currentSite);
    currentSiteTimer.innerHTML = "";
    currentSiteTimer.appendChild(siteEl);

    // Restore input values and focus after rendering (but only if timer is not active)
    if (!currentSite.timerData || !currentSite.timerData.isActive) {
      restoreCurrentSiteInputValues(preservedState);
    }

    // Start countdown if timer is active
    if (currentSite.timerData && currentSite.timerData.isActive) {
      let remaining = currentSite.timerData.remainingMs || 0;
      
      // Account for elapsed time if not paused
      if (!currentSite.timerData.isPaused && currentSite.timerData.lastUpdate) {
        const elapsed = Date.now() - currentSite.timerData.lastUpdate;
        remaining = Math.max(0, remaining - elapsed);
      }
      
      if (remaining > 0) {
        startCountdown(currentSite.hostname, remaining);
      }
    }
  }

  // Show temporary message
  function showTemporaryMessage(message) {
    // Create or update status message
    let statusEl = document.getElementById("temp-status");
    if (!statusEl) {
      statusEl = document.createElement("div");
      statusEl.id = "temp-status";
      statusEl.style.cssText =
        "position: fixed; top: 10px; right: 10px; background: #10b981; color: white; padding: 8px 12px; border-radius: 4px; font-size: 12px; z-index: 1000;";
      document.body.appendChild(statusEl);
    }

    statusEl.textContent = message;
    statusEl.style.display = "block";

    setTimeout(() => {
      if (statusEl) {
        statusEl.style.display = "none";
      }
    }, 2000);
  }

  // Start all timers globally
  async function startGlobalTimers() {
    const minutes = parseInt(globalMinutesEl.value) || 0;
    const seconds = parseInt(globalSecondsEl.value) || 0;
    const cooldownMinutes = parseInt(globalCooldownMinutesEl.value) || 0;
    const cooldownSeconds = parseInt(globalCooldownSecondsEl.value) || 0;
    
    if (minutes === 0 && seconds === 0) {
      showTemporaryMessage("Please enter a valid time");
      return;
    }
    
    const sites = await loadSitesList();
    if (sites.length === 0) {
      showTemporaryMessage("No sites to manage");
      return;
    }
    
    const totalMs = (minutes * 60 + seconds) * 1000;
    let startedCount = 0;
    
    // Save global cooldown settings for each site
    for (const site of sites) {
      await saveCooldownForSite(site.hostname, cooldownMinutes, cooldownSeconds);
    }
    
    // Start timer for each site
    for (const site of sites) {
      try {
        const response = await chrome.runtime.sendMessage({
          type: "START_TIMER",
          hostname: site.hostname,
          duration: totalMs,
        });
        
        if (response && response.success) {
          startedCount++;
        }
      } catch (error) {
        console.error(`Failed to start timer for ${site.hostname}:`, error);
      }
    }
    
    if (startedCount > 0) {
      showTemporaryMessage(`Started timers for ${startedCount} site(s)`);
      globalStatusEl.textContent = `Active: ${startedCount} timers running`;
      startGlobalTimerBtn.style.display = "none";
      stopGlobalTimerBtn.style.display = "inline-block";
      
      // Refresh current site timer display
      await renderCurrentSiteTimer(true);
    } else {
      showTemporaryMessage("Failed to start timers");
    }
  }
  
  // Stop all timers globally
  async function stopGlobalTimers() {
    const sites = await loadSitesList();
    let stoppedCount = 0;
    
    for (const site of sites) {
      try {
        const response = await chrome.runtime.sendMessage({
          type: "STOP_TIMER",
          hostname: site.hostname,
        });
        
        if (response && response.success) {
          stoppedCount++;
        }
      } catch (error) {
        console.error(`Failed to stop timer for ${site.hostname}:`, error);
      }
    }
    
    if (stoppedCount > 0) {
      showTemporaryMessage(`Stopped ${stoppedCount} timer(s)`);
      globalStatusEl.textContent = "";
      startGlobalTimerBtn.style.display = "inline-block";
      stopGlobalTimerBtn.style.display = "none";
      
      // Refresh current site timer display
      await renderCurrentSiteTimer(true);
    }
  }
  
  // Check if any timers are active
  async function checkActiveTimers() {
    const sites = await loadSitesList();
    let activeCount = 0;
    
    for (const site of sites) {
      const result = await chrome.storage.local.get([site.hostname]);
      const timerData = result[site.hostname];
      if (timerData && timerData.isActive) {
        activeCount++;
      }
    }
    
    if (activeCount > 0) {
      globalStatusEl.textContent = `Active: ${activeCount} timer(s) running`;
      startGlobalTimerBtn.style.display = "none";
      stopGlobalTimerBtn.style.display = "inline-block";
    } else {
      globalStatusEl.textContent = "";
      startGlobalTimerBtn.style.display = "inline-block";
      stopGlobalTimerBtn.style.display = "none";
    }
  }

  // Event listeners
  addCurrentSiteBtn.addEventListener("click", async () => {
    if (!currentHostname) {
      showTemporaryMessage("Please navigate to a website first");
      return;
    }
    await addSite(currentHostname);
  });

  manageTimersBtn.addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("manage.html") });
  });
  
  // Global timer event listeners
  startGlobalTimerBtn.addEventListener("click", startGlobalTimers);
  stopGlobalTimerBtn.addEventListener("click", stopGlobalTimers);
  
  // Toggle global timer section
  globalTimerHeader.addEventListener("click", () => {
    const isVisible = globalTimerContent.style.display !== "none";
    globalTimerContent.style.display = isVisible ? "none" : "block";
    globalChevron.textContent = isVisible ? "▶" : "▼";
    globalChevron.style.transform = isVisible ? "rotate(0deg)" : "rotate(0deg)";
  });

  // Initialize
  await getCurrentSite();
  await renderCurrentSiteTimer();
  await checkActiveTimers();

  // Update current site info periodically
  setInterval(async () => {
    await getCurrentSite();
    await renderCurrentSiteTimer(true); // Force render after timer state changes
    await checkActiveTimers();
  }, 1000);
});

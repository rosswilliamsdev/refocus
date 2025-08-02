document.addEventListener("DOMContentLoaded", async () => {
  const manualSiteInput = document.getElementById("manualSiteInput");
  const addManualSiteBtn = document.getElementById("addManualSite");
  const sitesContainer = document.getElementById("sitesContainer");
  const saveAllBtn = document.getElementById("saveAllBtn");

  let siteTimers = {}; // Store timer intervals for each site

  // Storage keys
  const SITES_LIST_KEY = "refocus_sites_list";
  const TIMER_SETTINGS_KEY = "refocus_timer_settings";

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
    console.log('About to save settings to storage:', JSON.stringify(settings));
    try {
      await chrome.storage.local.set({ [TIMER_SETTINGS_KEY]: settings });
      console.log('Successfully saved to storage');
      
      // Verify it was saved
      const verification = await chrome.storage.local.get([TIMER_SETTINGS_KEY]);
      console.log('Verification - what was actually saved:', JSON.stringify(verification));
    } catch (error) {
      console.error('Error saving timer settings:', error);
    }
  }

  // Save timer values for a specific site
  async function saveTimerForSite(hostname, minutes, seconds) {
    console.log('Saving timer for site:', hostname, 'values:', { minutes, seconds });
    const settings = await loadTimerSettings();
    settings[hostname] = { minutes, seconds };
    await saveTimerSettings(settings);
    console.log('Updated settings:', JSON.stringify(settings));
  }

  // Get saved timer values for a site (or defaults)
  async function getTimerForSite(hostname) {
    const settings = await loadTimerSettings();
    const result = settings[hostname] || { minutes: 0, seconds: 4 };
    console.log('Loading timer for site:', hostname, 'result:', JSON.stringify(result), 'from settings:', JSON.stringify(settings));
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
    await renderSitesList();
    showTemporaryMessage("Site added!");
  }

  // Remove site from the list
  async function removeSite(hostname) {
    const sites = await loadSitesList();
    const filteredSites = sites.filter((site) => site.hostname !== hostname);

    await saveSitesList(filteredSites);

    // Clear any active timer and storage for this site
    await chrome.alarms.clear(`timer_${hostname}`);
    await chrome.storage.local.remove(hostname);

    // Clear timer interval if running
    if (siteTimers[hostname]) {
      clearInterval(siteTimers[hostname]);
      delete siteTimers[hostname];
    }

    await renderSitesList();
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

    const endTime = Date.now() + totalMs;

    // Save timer state
    await chrome.storage.local.set({
      [hostname]: {
        isActive: true,
        endTime: endTime,
        totalMs: totalMs,
      },
    });

    // Create alarm
    await chrome.alarms.create(`timer_${hostname}`, {
      when: endTime,
    });

    await renderSitesList();
  }

  // Stop timer for a site
  async function stopTimer(hostname) {
    // Clear alarm
    await chrome.alarms.clear(`timer_${hostname}`);

    // Remove storage
    await chrome.storage.local.remove(hostname);

    // Clear timer interval
    if (siteTimers[hostname]) {
      clearInterval(siteTimers[hostname]);
      delete siteTimers[hostname];
    }

    await renderSitesList();
  }

  // Reset timer for a site
  async function resetTimer(hostname, minutes, seconds) {
    await stopTimer(hostname);
    await startTimer(hostname, minutes, seconds);
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
        const remaining = siteData.endTime - Date.now();
        if (remaining > 0) {
          updateTimerDisplay(hostname, remaining);
        } else {
          updateTimerDisplay(hostname, 0);
          // Timer expired - background script will handle it
          // Just update the UI after a short delay
          setTimeout(() => renderSitesList(), 1000);
        }
      } else {
        // Timer was stopped
        clearInterval(siteTimers[hostname]);
        delete siteTimers[hostname];
        renderSitesList();
      }
    }, 1000);
  }

  // Render a single site item
  async function createSiteElement(site) {
    const { hostname, timerData } = site;
    const isActive = timerData && timerData.isActive;
    const remainingMs = isActive
      ? Math.max(0, timerData.endTime - Date.now())
      : 0;

    // Get saved timer values for this site
    const savedTimer = await getTimerForSite(hostname);

    const siteEl = document.createElement("div");
    siteEl.className = "site-item";
    siteEl.innerHTML = `
      <div class="site-header">
        <div class="site-name">${hostname}</div>
        <button class="remove-site" data-hostname="${hostname}">Remove</button>
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
          <div class="timer-controls">
            <button class="stop-btn" data-hostname="${hostname}">Stop</button>
            <button class="reset-btn" data-hostname="${hostname}">Reset</button>
          </div>
          <div class="site-status">Timer active</div>
        `
            : `
          <div class="timer-input-row">
            <label>Min:</label>
            <input type="number" id="minutes-${hostname}" min="0" max="999" value="${savedTimer.minutes}" />
            <label>Sec:</label>
            <input type="number" id="seconds-${hostname}" min="0" max="59" value="${savedTimer.seconds}" />
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
    const removeBtn = siteEl.querySelector(".remove-site");
    const startBtn = siteEl.querySelector(".start-btn");
    const stopBtn = siteEl.querySelector(".stop-btn");
    const resetBtn = siteEl.querySelector(".reset-btn");
    const saveBtn = siteEl.querySelector(".save-btn");

    if (removeBtn) {
      removeBtn.addEventListener("click", async () => {
        await removeSite(hostname);
      });
    }

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

    if (stopBtn) {
      stopBtn.addEventListener("click", async () => {
        await stopTimer(hostname);
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", async () => {
        const minutesEl = document.getElementById(`minutes-${hostname}`);
        const secondsEl = document.getElementById(`seconds-${hostname}`);

        // Try to get values from the current timer inputs, or default to 5 minutes
        let minutes = 5;
        let seconds = 0;

        if (minutesEl && secondsEl) {
          minutes = parseInt(minutesEl.value);
          seconds = parseInt(secondsEl.value);
        }

        await resetTimer(hostname, minutes, seconds);
      });
    }

    // Add save button event listener
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const minutesEl = document.getElementById(`minutes-${hostname}`);
        const secondsEl = document.getElementById(`seconds-${hostname}`);
        
        if (minutesEl && secondsEl) {
          const minutes = parseInt(minutesEl.value) || 0;
          const seconds = parseInt(secondsEl.value) || 0;
          await saveTimerForSite(hostname, minutes, seconds);
          showTemporaryMessage(`Settings saved for ${hostname}!`);
        }
      });
    }

    return siteEl;
  }


  // Render the sites list
  async function renderSitesList() {
    const sites = await loadSitesList();

    // Clear existing timers
    Object.keys(siteTimers).forEach((hostname) => {
      clearInterval(siteTimers[hostname]);
      delete siteTimers[hostname];
    });

    sitesContainer.innerHTML = "";

    if (sites.length === 0) {
      sitesContainer.innerHTML =
        '<div class="no-sites">No sites added yet. Add a site to get started!</div>';
      return;
    }

    for (const site of sites) {
      const siteEl = await createSiteElement(site);
      sitesContainer.appendChild(siteEl);

      // Start countdown if timer is active
      if (site.timerData && site.timerData.isActive) {
        const remaining = Math.max(0, site.timerData.endTime - Date.now());
        if (remaining > 0) {
          startCountdown(site.hostname, remaining);
        }
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

  // Save all timer settings
  async function saveAllSettings() {
    const minutesInputs = document.querySelectorAll('input[id^="minutes-"]');
    
    let savedCount = 0;
    
    for (const minutesInput of minutesInputs) {
      const hostname = minutesInput.id.replace('minutes-', '');
      const secondsInput = document.getElementById(`seconds-${hostname}`);
      
      if (secondsInput) {
        const minutes = parseInt(minutesInput.value) || 0;
        const seconds = parseInt(secondsInput.value) || 0;
        await saveTimerForSite(hostname, minutes, seconds);
        savedCount++;
      }
    }
    
    showTemporaryMessage(`Saved settings for ${savedCount} sites!`);
  }

  // Event listeners
  addManualSiteBtn.addEventListener("click", async () => {
    const hostname = manualSiteInput.value.trim();
    if (!hostname) {
      showTemporaryMessage("Please enter a site");
      return;
    }

    await addSite(hostname);
    manualSiteInput.value = "";
  });

  saveAllBtn.addEventListener("click", async () => {
    await saveAllSettings();
  });

  // Allow Enter key to add manual site
  manualSiteInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      addManualSiteBtn.click();
    }
  });

  // Listen for storage changes (when sites are added from popup)
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes[SITES_LIST_KEY]) {
      console.log('Sites list changed, re-rendering');
      renderSitesList();
    }
  });

  // Initialize
  await renderSitesList();
});

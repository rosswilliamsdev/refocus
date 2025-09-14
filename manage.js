document.addEventListener("DOMContentLoaded", async () => {
  const manualSiteInput = document.getElementById("manualSiteInput");
  const addManualSiteBtn = document.getElementById("addManualSite");
  const sitesContainer = document.getElementById("sitesContainer");
  // const saveAllBtn = document.getElementById("saveAllBtn"); // Removed button
  
  // Global timer elements
  const globalTimerHeader = document.getElementById("globalTimerHeader");
  const globalTimerContent = document.getElementById("globalTimerContent");
  const globalChevron = document.getElementById("globalChevron");
  const globalMinutesEl = document.getElementById("globalMinutes");
  const globalSecondsEl = document.getElementById("globalSeconds");
  const globalCooldownMinutesEl = document.getElementById("globalCooldownMinutes");
  const globalCooldownSecondsEl = document.getElementById("globalCooldownSeconds");
  const startAllTimersBtn = document.getElementById("startAllTimers");
  const globalStatusEl = document.getElementById("globalStatus");

  let siteTimers = {}; // Store timer intervals for each site

  // Storage keys
  const SITES_LIST_KEY = "refocus_sites_list";
  const TIMER_SETTINGS_KEY = "refocus_timer_settings";
  const COOLDOWN_SETTINGS_KEY = "refocus_cooldown_settings";

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
    const result = settings[hostname] || { minutes: 5, seconds: 0 };
    console.log('Loading timer for site:', hostname, 'result:', JSON.stringify(result), 'from settings:', JSON.stringify(settings));
    return result;
  }

  // Load cooldown settings from storage
  async function loadCooldownSettings() {
    const result = await chrome.storage.local.get([COOLDOWN_SETTINGS_KEY]);
    return result[COOLDOWN_SETTINGS_KEY] || {};
  }

  // Save cooldown settings to storage
  async function saveCooldownSettings(settings) {
    console.log('About to save cooldown settings to storage:', JSON.stringify(settings));
    try {
      await chrome.storage.local.set({ [COOLDOWN_SETTINGS_KEY]: settings });
      console.log('Successfully saved cooldown settings to storage');
      
      // Verify it was saved
      const verification = await chrome.storage.local.get([COOLDOWN_SETTINGS_KEY]);
      console.log('Verification - cooldown settings actually saved:', JSON.stringify(verification));
    } catch (error) {
      console.error('Error saving cooldown settings:', error);
    }
  }

  // Save cooldown values for a specific site
  async function saveCooldownForSite(hostname, minutes, seconds) {
    console.log('Saving cooldown for site:', hostname, 'values:', { minutes, seconds });
    const settings = await loadCooldownSettings();
    settings[hostname] = { minutes, seconds };
    await saveCooldownSettings(settings);
    console.log('Updated cooldown settings:', JSON.stringify(settings));
  }

  // Get saved cooldown values for a site (or defaults)
  async function getCooldownForSite(hostname) {
    const settings = await loadCooldownSettings();
    const result = settings[hostname] || { minutes: 0, seconds: 20 };
    console.log('Loading cooldown for site:', hostname, 'result:', JSON.stringify(result), 'from settings:', JSON.stringify(settings));
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

    await renderSitesList();
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
        <button class="remove-site" data-hostname="${hostname}" ${isActive && remainingMs > 0 ? 'disabled title="Cannot remove site while timer is active"' : ''}>Remove</button>
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
    const removeBtn = siteEl.querySelector(".remove-site");
    const startBtn = siteEl.querySelector(".start-btn");
    const saveBtn = siteEl.querySelector(".save-btn");

    if (removeBtn) {
      removeBtn.addEventListener("click", async () => {
        if (removeBtn.disabled) {
          return; // Don't allow removal if button is disabled
        }
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


    // Add save button event listener
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const minutesEl = document.getElementById(`minutes-${hostname}`);
        const secondsEl = document.getElementById(`seconds-${hostname}`);
        
        if (minutesEl && secondsEl) {
          const minutes = parseInt(minutesEl.value) || 0;
          const seconds = parseInt(secondsEl.value) || 0;
          await saveTimerForSite(hostname, minutes, seconds);
        }
        
        const cooldownMinutesEl = document.getElementById(`cooldown-minutes-${hostname}`);
        const cooldownSecondsEl = document.getElementById(`cooldown-seconds-${hostname}`);
        
        if (cooldownMinutesEl && cooldownSecondsEl) {
          // Get current saved values to use as fallback
          const currentCooldown = await getCooldownForSite(hostname);
          const cooldownMinutes = parseInt(cooldownMinutesEl.value) || currentCooldown.minutes;
          const cooldownSeconds = parseInt(cooldownSecondsEl.value) || currentCooldown.seconds;
          await saveCooldownForSite(hostname, cooldownMinutes, cooldownSeconds);
        }
        
        showTemporaryMessage(`Settings saved for ${hostname}!`);
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
        let remaining = site.timerData.remainingMs || 0;
        
        // Account for elapsed time if not paused
        if (!site.timerData.isPaused && site.timerData.lastUpdate) {
          const elapsed = Date.now() - site.timerData.lastUpdate;
          remaining = Math.max(0, remaining - elapsed);
        }
        
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


  // Start all timers globally
  async function startAllTimers() {
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
      showTemporaryMessage(`Started timers for ${startedCount} site(s) with ${cooldownMinutes}:${cooldownSeconds.toString().padStart(2, '0')} cooldown`);
      globalStatusEl.textContent = `Active: ${startedCount} timers running`;
      await renderSitesList(); // Refresh the display
    } else {
      showTemporaryMessage("Failed to start timers");
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
    } else {
      globalStatusEl.textContent = "";
    }
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

  // saveAllBtn.addEventListener("click", async () => {
  //   await saveAllSettings();
  // }); // Removed save all button functionality

  // Allow Enter key to add manual site
  manualSiteInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      addManualSiteBtn.click();
    }
  });
  
  // Global timer event listeners
  startAllTimersBtn.addEventListener("click", startAllTimers);
  
  // Toggle global timer section
  globalTimerHeader.addEventListener("click", () => {
    const isVisible = globalTimerContent.style.display !== "none";
    globalTimerContent.style.display = isVisible ? "none" : "block";
    globalChevron.textContent = isVisible ? "▶" : "▼";
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
  await checkActiveTimers();
  
  // Update active timer count periodically
  setInterval(checkActiveTimers, 1000);
});

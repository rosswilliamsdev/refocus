document.addEventListener("DOMContentLoaded", async () => {
  const currentSiteEl = document.getElementById("currentSite");
  const minutesInput = document.getElementById("minutes");
  const secondsInput = document.getElementById("seconds");
  const startButton = document.getElementById("startTimer");
  const stopButton = document.getElementById("stopTimer");
  const resetButton = document.getElementById("resetTimer");
  const timerDisplay = document.getElementById("timerDisplay");
  const statusEl = document.getElementById("status");

  let currentHostname = "";
  let timerInterval = null;

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
        await loadSiteData();
      } else {
        currentSiteEl.textContent = "No active tab";
      }
    } catch (error) {
      currentSiteEl.textContent = "Unable to detect site";
      console.error("Error getting current site:", error);
    }
  }

  // Load existing timer data for current site
  async function loadSiteData() {
    if (!currentHostname) return;

    const result = await chrome.storage.local.get([currentHostname]);
    const siteData = result[currentHostname];

    if (siteData && siteData.isActive) {
      const remaining = siteData.endTime - Date.now();
      if (remaining > 0) {
        // Timer is active
        showActiveTimer(remaining);
        startCountdown(remaining);
      } else {
        // Timer expired - background script should have handled this already
        // Just show inactive state (storage cleanup will be handled by background script)
        showInactiveTimer();
      }
    } else {
      showInactiveTimer();
    }
  }

  function showActiveTimer(remainingMs) {
    startButton.style.display = "none";
    stopButton.style.display = "inline-block";
    resetButton.style.display = "inline-block";
    timerDisplay.style.display = "block";
    minutesInput.disabled = true;
    secondsInput.disabled = true;
    statusEl.textContent = `Timer active for ${currentHostname}`;
  }

  function showInactiveTimer() {
    startButton.style.display = "inline-block";
    stopButton.style.display = "none";
    resetButton.style.display = "none";
    timerDisplay.style.display = "none";
    minutesInput.disabled = false;
    secondsInput.disabled = false;
    statusEl.textContent = "";
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function startCountdown(remainingMs) {
    updateDisplay(remainingMs);

    timerInterval = setInterval(() => {
      const result = chrome.storage.local.get([currentHostname]);
      result.then((data) => {
        const siteData = data[currentHostname];
        if (siteData && siteData.isActive) {
          const remaining = siteData.endTime - Date.now();
          if (remaining > 0) {
            updateDisplay(remaining);
          } else {
            // Timer expired - let background script handle it, just update UI
            updateDisplay(0);
            // Don't call showInactiveTimer() here - let the background script handle expiration
          }
        } else {
          // Timer was manually stopped or cleared
          showInactiveTimer();
        }
      });
    }, 1000);
  }

  function updateDisplay(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    timerDisplay.textContent = `${minutes}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }

  // Event listeners
  startButton.addEventListener("click", async () => {
    if (!currentHostname) {
      statusEl.textContent = "Please navigate to a website first";
      return;
    }

    const minutes = parseInt(minutesInput.value) || 0;
    const seconds = parseInt(secondsInput.value) || 0;
    const totalMs = (minutes * 60 + seconds) * 1000;

    if (totalMs <= 0) {
      statusEl.textContent = "Please enter a valid time";
      return;
    }

    const endTime = Date.now() + totalMs;

    // Save timer state for this site
    await chrome.storage.local.set({
      [currentHostname]: {
        isActive: true,
        endTime: endTime,
        totalMs: totalMs,
      },
    });

    // Create alarm for this site
    await chrome.alarms.create(`timer_${currentHostname}`, {
      when: endTime,
    });

    showActiveTimer(totalMs);
    startCountdown(totalMs);
  });

  stopButton.addEventListener("click", async () => {
    if (!currentHostname) return;

    // Clear alarm
    await chrome.alarms.clear(`timer_${currentHostname}`);

    // Remove storage
    await chrome.storage.local.remove(currentHostname);

    showInactiveTimer();
  });

  resetButton.addEventListener("click", async () => {
    if (!currentHostname) return;

    const minutes = parseInt(minutesInput.value) || 0;
    const seconds = parseInt(secondsInput.value) || 0;
    const totalMs = (minutes * 60 + seconds) * 1000;

    if (totalMs <= 0) {
      statusEl.textContent = "Please enter a valid time";
      return;
    }

    const endTime = Date.now() + totalMs;

    // Clear existing alarm
    await chrome.alarms.clear(`timer_${currentHostname}`);

    // Save new timer state
    await chrome.storage.local.set({
      [currentHostname]: {
        isActive: true,
        endTime: endTime,
        totalMs: totalMs,
      },
    });

    // Create new alarm
    await chrome.alarms.create(`timer_${currentHostname}`, {
      when: endTime,
    });

    showActiveTimer(totalMs);
    startCountdown(totalMs);
  });

  // Initialize
  await getCurrentSite();
});

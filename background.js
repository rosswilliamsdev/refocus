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

// Handle messages from content scripts
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === "START_TIMER") {
    const { hostname, duration } = message;

    try {
      // Save timer state with remaining time (not absolute end time)
      await chrome.storage.local.set({
        [hostname]: {
          isActive: true,
          isPaused: false,
          remainingMs: duration,
          totalMs: duration,
          lastUpdate: Date.now(),
        },
      });

      // Start interval-based countdown instead of alarm
      startTimerCountdown(hostname);

      console.log(
        "Background: Started timer for",
        hostname,
        "duration:",
        duration + "ms"
      );
      sendResponse({ success: true });
    } catch (error) {
      console.error("Background: Failed to start timer:", error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // Keep message channel open for async response
  }

  if (message.type === "STOP_TIMER") {
    const { hostname } = message;

    try {
      // Clear interval if running
      clearTimerInterval(hostname);

      // Remove storage
      await chrome.storage.local.remove(hostname);

      console.log("Background: Stopped timer for", hostname);
      sendResponse({ success: true });
    } catch (error) {
      console.error("Background: Failed to stop timer:", error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // Keep message channel open for async response
  }

  if (message.type === "PAUSE_TIMER") {
    const { hostname } = message;

    try {
      const result = await chrome.storage.local.get([hostname]);
      const timerData = result[hostname];

      if (timerData && timerData.isActive && !timerData.isPaused) {
        // Update remaining time based on how much time has passed
        const now = Date.now();
        const elapsed = now - timerData.lastUpdate;
        const newRemaining = Math.max(0, timerData.remainingMs - elapsed);

        await chrome.storage.local.set({
          [hostname]: {
            ...timerData,
            isPaused: true,
            remainingMs: newRemaining,
            lastUpdate: now,
          },
        });

        console.log(
          "Background: Paused timer for",
          hostname,
          "remaining:",
          newRemaining + "ms"
        );
        sendResponse({ success: true });
      } else {
        sendResponse({
          success: false,
          error: "Timer not active or already paused",
        });
      }
    } catch (error) {
      console.error("Background: Failed to pause timer:", error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // Keep message channel open for async response
  }

  if (message.type === "RESUME_TIMER") {
    const { hostname } = message;

    try {
      const result = await chrome.storage.local.get([hostname]);
      const timerData = result[hostname];

      if (timerData && timerData.isActive && timerData.isPaused) {
        await chrome.storage.local.set({
          [hostname]: {
            ...timerData,
            isPaused: false,
            lastUpdate: Date.now(),
          },
        });

        console.log(
          "Background: Resumed timer for",
          hostname,
          "remaining:",
          timerData.remainingMs + "ms"
        );
        sendResponse({ success: true });
      } else {
        sendResponse({
          success: false,
          error: "Timer not active or not paused",
        });
      }
    } catch (error) {
      console.error("Background: Failed to resume timer:", error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // Keep message channel open for async response
  }

  if (message.type === "OPEN_POPUP") {
    try {
      // Open the extension popup by programmatically opening the action popup
      await chrome.action.openPopup();
      sendResponse({ success: true });
    } catch (error) {
      console.error("Background: Failed to open popup:", error);
      // Fallback: open the popup in a new tab if direct popup opening fails
      try {
        await chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") });
        sendResponse({ success: true, fallback: true });
      } catch (fallbackError) {
        console.error("Background: Fallback also failed:", fallbackError);
        sendResponse({ success: false, error: fallbackError.message });
      }
    }
    return true; // Keep message channel open for async response
  }
});

// Timer interval management
const timerIntervals = new Map();

// Start interval-based countdown for a timer
function startTimerCountdown(hostname) {
  // Clear any existing interval
  clearTimerInterval(hostname);

  const interval = setInterval(async () => {
    try {
      const result = await chrome.storage.local.get([hostname]);
      const timerData = result[hostname];

      if (!timerData || !timerData.isActive) {
        clearTimerInterval(hostname);
        return;
      }

      // Only count down if not paused
      if (!timerData.isPaused) {
        const now = Date.now();
        const elapsed = now - timerData.lastUpdate;
        const newRemaining = Math.max(0, timerData.remainingMs - elapsed);

        if (newRemaining <= 0) {
          // Timer expired
          console.log("Timer expired for hostname:", hostname);
          await handleTimerExpired(hostname);
          clearTimerInterval(hostname);
        } else {
          // Update remaining time
          await chrome.storage.local.set({
            [hostname]: {
              ...timerData,
              remainingMs: newRemaining,
              lastUpdate: now,
            },
          });
        }
      }
    } catch (error) {
      console.error("Error in timer countdown:", error);
      clearTimerInterval(hostname);
    }
  }, 1000); // Check every second

  timerIntervals.set(hostname, interval);
  console.log("Started timer countdown for", hostname);
}

// Clear timer interval
function clearTimerInterval(hostname) {
  const interval = timerIntervals.get(hostname);
  if (interval) {
    clearInterval(interval);
    timerIntervals.delete(hostname);
    console.log("Cleared timer interval for", hostname);
  }
}

// Handle timer expiration (extracted from alarm handler)
async function handleTimerExpired(hostname) {
  try {
    // Get all tabs and filter by hostname
    const allTabs = await chrome.tabs.query({});
    console.log("Total tabs:", allTabs.length);

    const matchingTabs = allTabs.filter((tab) => {
      if (!tab.url) return false;
      try {
        const tabUrl = new URL(tab.url);
        const cleanedTabHostname = cleanHostname(tabUrl.hostname);
        const cleanedStoredHostname = cleanHostname(hostname);

        const matches =
          cleanedTabHostname === cleanedStoredHostname ||
          cleanedTabHostname.includes(cleanedStoredHostname) ||
          cleanedStoredHostname.includes(cleanedTabHostname);

        if (matches) {
          console.log("Found matching tab:", tab.id, tab.url);
        }
        return matches;
      } catch {
        return false;
      }
    });

    console.log("Matching tabs found:", matchingTabs.length);

    // Send message to all matching tabs
    for (const tab of matchingTabs) {
      try {
        console.log("Sending TIMER_EXPIRED message to tab:", tab.id);
        const response = await chrome.tabs.sendMessage(tab.id, {
          type: "TIMER_EXPIRED",
        });
        console.log("Message response:", response);
      } catch (error) {
        console.log(`Could not send message to tab ${tab.id}:`, error);
        // If content script isn't ready, try injecting it
        try {
          console.log("Attempting to inject content script into tab:", tab.id);
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content.js"],
          });
          // Try sending message again after injection
          const retryResponse = await chrome.tabs.sendMessage(tab.id, {
            type: "TIMER_EXPIRED",
          });
          console.log("Retry message response:", retryResponse);
        } catch (injectionError) {
          console.log(
            `Failed to inject content script or send message to tab ${tab.id}:`,
            injectionError
          );
        }
      }
    }
  } catch (error) {
    console.error("Error handling timer expiration:", error);
  }

  // Clean up storage
  console.log("Cleaning up storage for hostname:", hostname);
  chrome.storage.local.remove(hostname);
}

// Note: Replaced alarm-based system with interval-based system for pause/resume functionality

// Clean hostname to remove protocols, www, etc.
function cleanHostname(input) {
  let hostname = input.trim().toLowerCase();
  
  // Remove protocol if present
  hostname = hostname.replace(/^https?:\/\//, '');
  
  // Remove www. if present
  hostname = hostname.replace(/^www\./, '');
  
  // Remove path, query params, etc.
  hostname = hostname.split('/')[0];
  hostname = hostname.split('?')[0];
  hostname = hostname.split('#')[0];
  
  return hostname;
}

// Handle messages from content scripts
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === "START_TIMER") {
    const { hostname, duration } = message;
    const endTime = Date.now() + duration;

    try {
      // Save timer state
      await chrome.storage.local.set({
        [hostname]: {
          isActive: true,
          endTime: endTime,
          totalMs: duration,
        },
      });

      // Create alarm
      await chrome.alarms.create(`timer_${hostname}`, {
        when: endTime,
      });

      console.log("Background: Started timer for", hostname, "duration:", duration + "ms");
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
      // Clear alarm
      await chrome.alarms.clear(`timer_${hostname}`);
      
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
});

// Handle alarm events
chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log("Alarm triggered:", alarm.name);
  
  if (alarm.name.startsWith("timer_")) {
    const hostname = alarm.name.replace("timer_", "");
    console.log("Timer expired for hostname:", hostname);

    try {
      // Get all tabs and filter by hostname
      const allTabs = await chrome.tabs.query({});
      console.log("Total tabs:", allTabs.length);
      
      const matchingTabs = allTabs.filter(tab => {
        if (!tab.url) return false;
        try {
          const tabUrl = new URL(tab.url);
          const cleanedTabHostname = cleanHostname(tabUrl.hostname);
          const cleanedStoredHostname = cleanHostname(hostname);
          
          const matches = cleanedTabHostname === cleanedStoredHostname || 
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
          const response = await chrome.tabs.sendMessage(tab.id, { type: "TIMER_EXPIRED" });
          console.log("Message response:", response);
        } catch (error) {
          console.log(`Could not send message to tab ${tab.id}:`, error);
        }
      }
    } catch (error) {
      console.error("Error handling alarm:", error);
    }

    // Clean up storage
    console.log("Cleaning up storage for hostname:", hostname);
    chrome.storage.local.remove(hostname);
  }
});

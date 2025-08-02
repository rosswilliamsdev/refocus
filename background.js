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

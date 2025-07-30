// Handle alarm events
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.startsWith("timer_")) {
    const hostname = alarm.name.replace("timer_", "");

    // Send message to content script
    chrome.tabs.query({ url: `*://${hostname}/*` }, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs.sendMessage(tab.id, { type: "TIMER_EXPIRED" });
      });
    });

    // Clean up storage
    chrome.storage.local.remove(hostname);
  }
});

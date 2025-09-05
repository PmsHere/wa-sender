// Background service worker for the extension
chrome.runtime.onInstalled.addListener(function() {
  console.log('WhatsApp Campaign Manager installed');
});

// Handle extension icon click
chrome.action.onClicked.addListener(function(tab) {
  // This will open the popup by default
});
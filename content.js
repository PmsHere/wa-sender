(function() {
  let campaignInterval = null;
  let currentContacts = [];
  let currentMessage = '';
  let currentDelay = 30000;
  let currentIndex = 0;
  let successCount = 0;
  let failureCount = 0;
  
  // Listen for messages from popup
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'startCampaign') {
      startCampaign(request.contacts, request.message, request.delay);
    }
    
    if (request.action === 'stopCampaign') {
      stopCampaign();
    }
  });
  
  function startCampaign(contacts, message, delay) {
    currentContacts = contacts;
    currentMessage = message;
    currentDelay = delay;
    currentIndex = 0;
    successCount = 0;
    failureCount = 0;
    
    // Send initial status
    sendStatusUpdate();
    
    // Start the campaign
    campaignInterval = setInterval(processNextContact, currentDelay);
    
    // Process first contact immediately
    setTimeout(processNextContact, 1000);
  }
  
  function stopCampaign() {
    if (campaignInterval) {
      clearInterval(campaignInterval);
      campaignInterval = null;
    }
    
    sendStatusUpdate();
    chrome.runtime.sendMessage({action: 'campaignComplete'});
  }
  
  function processNextContact() {
    if (currentIndex >= currentContacts.length) {
      stopCampaign();
      return;
    }
    
    const phone = currentContacts[currentIndex];
    openChat(phone);
    
    // Wait for chat to open and then send message
    setTimeout(() => {
      const success = sendMessage(currentMessage);
      
      const reportEntry = {
        phone: phone,
        status: success ? 'Success' : 'Failed',
        timestamp: new Date().toISOString(),
        error: success ? null : 'Failed to send message'
      };
      
      if (success) {
        successCount++;
      } else {
        failureCount++;
      }
      
      currentIndex++;
      sendStatusUpdate(reportEntry);
    }, 2000);
  }
  
  function openChat(phone) {
    // Implementation to open chat with the given phone number
    // This is a simplified version - actual implementation would need to
    // interact with WhatsApp Web's UI
    
    console.log(`Opening chat with ${phone}`);
    // In a real implementation, we would find and click the new chat button,
    // enter the phone number, and open the chat
  }
  
  function sendMessage(message) {
    try {
      // Implementation to send message in the open chat
      // This is a simplified version - actual implementation would need to
      // interact with WhatsApp Web's UI
      
      console.log(`Sending message: ${message}`);
      
      // In a real implementation, we would:
      // 1. Find the message input field
      // 2. Set the message text
      // 3. Trigger the send action (click send button or press Enter)
      
      // For demonstration, we'll assume 90% success rate
      return Math.random() > 0.1;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }
  
  function sendStatusUpdate(reportEntry = null) {
    chrome.runtime.sendMessage({
      action: 'updateStatus',
      currentIndex: currentIndex,
      successCount: successCount,
      failureCount: failureCount,
      currentContact: currentContacts[currentIndex] || '',
      reportEntry: reportEntry
    });
  }
})();
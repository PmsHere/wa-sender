document.addEventListener('DOMContentLoaded', function() {
  const numbersInput = document.getElementById('numbersInput');
  const messageInput = document.getElementById('messageInput');
  const delayInput = document.getElementById('delayInput');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const statusText = document.getElementById('statusText');
  const progressText = document.getElementById('progressText');
  const currentContact = document.getElementById('currentContact');
  const reportSummary = document.getElementById('reportSummary');
  const downloadBtn = document.getElementById('downloadBtn');
  
  let campaignActive = false;
  let contacts = [];
  let currentIndex = 0;
  let successCount = 0;
  let failureCount = 0;
  let reportData = [];
  
  // Load saved data
  chrome.storage.local.get(['numbers', 'message', 'delay'], function(data) {
    if (data.numbers) numbersInput.value = data.numbers;
    if (data.message) messageInput.value = data.message;
    if (data.delay) delayInput.value = data.delay;
  });
  
  // Save data when inputs change
  numbersInput.addEventListener('input', debounce(saveData, 300));
  messageInput.addEventListener('input', debounce(saveData, 300));
  delayInput.addEventListener('input', debounce(saveData, 300));
  
  function saveData() {
    chrome.storage.local.set({
      numbers: numbersInput.value,
      message: messageInput.value,
      delay: delayInput.value
    });
  }
  
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  startBtn.addEventListener('click', function() {
    const numbers = parseNumbers(numbersInput.value);
    const message = messageInput.value.trim();
    const delay = parseInt(delayInput.value) * 1000; // Convert to milliseconds
    
    if (numbers.length === 0) {
      alert('Please enter at least one phone number');
      return;
    }
    
    if (message.length === 0) {
      alert('Please enter a message');
      return;
    }
    
    if (delay < 1000) {
      alert('Delay must be at least 1 second');
      return;
    }
    
    contacts = numbers;
    currentIndex = 0;
    successCount = 0;
    failureCount = 0;
    reportData = [];
    campaignActive = true;
    
    updateUI();
    
    // Send message to content script to start campaign
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'startCampaign',
        contacts: contacts,
        message: message,
        delay: delay
      });
    });
  });
  
  stopBtn.addEventListener('click', function() {
    campaignActive = false;
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'stopCampaign'
      });
    });
    
    updateUI();
  });
  
  downloadBtn.addEventListener('click', function() {
    if (reportData.length === 0) return;
    
    const csvContent = generateCSV(reportData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'whatsapp_campaign_report.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
  
  function parseNumbers(input) {
    return input
      .split(/[\n,]+/)
      .map(num => num.trim().replace(/[^0-9]/g, ''))
      .filter(num => num.length > 0);
  }
  
  function generateCSV(data) {
    const headers = ['Phone Number', 'Status', 'Timestamp', 'Error'];
    const rows = data.map(item => [
      item.phone,
      item.status,
      item.timestamp,
      item.error || ''
    ]);
    
    return [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
  }
  
  function updateUI() {
    if (campaignActive) {
      startBtn.disabled = true;
      stopBtn.disabled = false;
      statusText.textContent = 'Campaign running';
      statusText.style.color = '#25d366';
    } else {
      startBtn.disabled = false;
      stopBtn.disabled = true;
      statusText.textContent = 'Campaign stopped';
      statusText.style.color = '#e6e6e6';
    }
    
    progressText.textContent = `${currentIndex}/${contacts.length} contacts processed`;
    reportSummary.textContent = `Success: ${successCount}, Failed: ${failureCount}`;
    
    if (reportData.length > 0) {
      downloadBtn.disabled = false;
    } else {
      downloadBtn.disabled = true;
    }
  }
  
  // Listen for messages from content script
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'updateStatus') {
      currentIndex = request.currentIndex;
      successCount = request.successCount;
      failureCount = request.failureCount;
      currentContact.textContent = `Current: ${request.currentContact || 'None'}`;
      
      if (request.reportEntry) {
        reportData.push(request.reportEntry);
      }
      
      updateUI();
    }
    
    if (request.action === 'campaignComplete') {
      campaignActive = false;
      updateUI();
    }
  });
});
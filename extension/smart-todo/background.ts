// 初始安装或更新时尝试获取认证
chrome.runtime.onInstalled.addListener(() => {
  chrome.identity.getAuthToken({ interactive: true }, (token) => {
    if (chrome.runtime.lastError) {
      console.error('Initial auth error:', chrome.runtime.lastError);
    } else {
      console.log('Initial auth token obtained');
    }
  });
});

// 处理来自扩展其他部分的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_AUTH_TOKEN') {

    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError });
      } else {
        sendResponse({ success: true, token });
      }
    });
    return true; // 保持消息通道开放
  }
  
  if (request.type === 'ADD_CALENDAR_EVENT') {
    handleAddCalendarEvent(request.event, sendResponse);
    return true; // 保持消息通道开放
  }
});

async function handleAddCalendarEvent(event: any, sendResponse: (response: any) => void) {
  try {
    // 获取认证令牌
    debugger;
    const token = await new Promise<string>((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else if (!token) {
          reject(new Error('No token received'));
        } else {
          resolve(token);
        }
      });
    });

    // 调用 Google Calendar API
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Calendar API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    sendResponse({ success: true, data });
  } catch (error) {
    console.error('Error in handleAddCalendarEvent:', error);
    sendResponse({ success: false, error: error.message });
  }
} 
function getAuthToken() {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ 'interactive': true }, function(token) {
        if (chrome.runtime.lastError) {
          console.error('Error getting auth token:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          console.log('Successfully got auth token:', token);
          resolve(token);
        }
      });
    });
  }
  
  // 测试获取令牌
  async function testAuth() {
    try {
      const token = await getAuthToken();
      console.log('Token:', token);
      
      // 验证令牌是否有效
      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList',
        {
          headers: {
            'Authorization': 'Bearer ' + token
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('Calendar list:', data);
      } else {
        console.error('Failed to fetch calendar list:', response.status);
      }
    } catch (error) {
      console.error('Auth test failed:', error);
    }
  }
  
  // 监听扩展安装或更新
  chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed/updated');
    testAuth();
  });

  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'ADD_CALENDAR_EVENT') {
      getAuthToken()
        .then(async (token) => {
          const response = await fetch(
            'https://www.googleapis.com/calendar/v3/calendars/primary/events',
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(request.event)
            }
          );

          if (response.ok) {
            const data = await response.json();
            sendResponse({ success: true, data });
          } else {
            const error = await response.json();
            sendResponse({ success: false, error: error.error.message });
          }
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });

      return true; // Will respond asynchronously
    }
  });
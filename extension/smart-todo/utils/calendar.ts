import type { TodoEvent } from "./types";
export async function addEventToGoogleCalendar(todo: TodoEvent) {
  // 1. 确保已经获取了访问令牌
  const token = await getAccessToken();

  // 2. 准备事件数据
  const event = {
    summary: todo.title,
    description: `${todo.description || ''}${todo.priority ? `\nPriority: ${todo.priority}` : ''}`,
    start: {
      dateTime: new Date(todo.startDate).toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    end: {
      dateTime: new Date(todo.endDate).toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  };

  try {
    // 检查当天是否已经存在同名事件
    const todoDate = new Date(todo.startDate);
    const startOfDay = new Date(todoDate.getFullYear(), todoDate.getMonth(), todoDate.getDate());
    const endOfDay = new Date(todoDate.getFullYear(), todoDate.getMonth(), todoDate.getDate(), 23, 59, 59);

    const timeMin = startOfDay.toISOString();
    const timeMax = endOfDay.toISOString();

    // 查询当天的所有事件
    const searchResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      }
    );

    if (!searchResponse.ok) {
      throw new Error(`Failed to search events: ${searchResponse.statusText}`);
    }

    const existingEvents = await searchResponse.json();

    // 检查是否存在同名事件
    const duplicateEvent = existingEvents.items?.find(item => item.summary === todo.title);

    if (duplicateEvent) {
      console.log(`Event "${todo.title}" already exists for this day, skipping creation`);
      return duplicateEvent;
    }

    // 3. 如果不存在同名事件，则调用 Google Calendar API 创建新事件
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event)
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to add event: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error adding event to calendar:', error);
    throw error;
  }
}

// 获取访问令牌的函数
async function getAccessToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(token);
      }
    });
  });
}
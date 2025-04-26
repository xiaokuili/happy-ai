import type { TodoEvent } from "./types";

export async function addEventToGoogleCalendar(todo: TodoEvent) {
  const event = {
    summary: todo.title,
    description: `${todo.description}\nPriority: ${todo.priority}`,
    start: {
      dateTime: todo.startDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    end: {
      dateTime: todo.endDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  }

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { 
        type: 'ADD_CALENDAR_EVENT', 
        event 
      },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else if (response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response.error));
        }
      }
    );
  });
} 
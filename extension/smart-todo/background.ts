import { handleNotionPage } from "./utils/notion"
import { addEventToGoogleCalendar } from "./utils/calendar"

// Function to get Google Calendar auth token
async function getAuthToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ 'interactive': true }, function(token) {
      if (chrome.runtime.lastError) {
        console.error('Error getting auth token:', chrome.runtime.lastError)
        reject(chrome.runtime.lastError)
      } else {
        console.log('Successfully got auth token')
        resolve(token)
      }
    })
  })
}

// Main background script listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Received message in background:", message)
  
  if (message.type === 'PROCESS_NOTION_PAGE') {
    // Handle the Notion page processing
    handleNotionPageProcess(message.pageId, sender.tab?.id)
      .then(() => {
        sendResponse({ success: true })
      })
      .catch((error) => {
        console.error("Error in handleNotionPageProcess:", error)
        sendResponse({ 
          success: false, 
          error: error.message || 'Failed to process Notion page'
        })
      })
    
    return true // Keep the message channel open for async response
  }
})

// Main function to handle Notion page processing
async function handleNotionPageProcess(pageId: string, tabId?: number) {
  try {
    console.log("Processing Notion page:", pageId)
    
    // // Get todo events from Notion
    // const todoEvents = await handleNotionPage(pageId)
    // console.log("Todo events from Notion:", todoEvents)
    
    // // Get auth token for Google Calendar
    // const token = await getAuthToken()
    
    // // Process each todo event
    // for (const event of todoEvents) {
    //   try {
    //     const calendarEvent = await addEventToGoogleCalendar(event)
    //     console.log("Added to calendar:", calendarEvent)
        
    //     // Notify content script of success
    //     if (tabId) {
    //       chrome.tabs.sendMessage(tabId, {
    //         type: 'EVENT_ADDED',
    //         eventTitle: event.title
    //       })
    //     }
    //   } catch (err) {
    //     console.error("Error adding event to calendar:", err)
        
    //     // Notify content script of failure
    //     if (tabId) {
    //       chrome.tabs.sendMessage(tabId, {
    //         type: 'EVENT_FAILED',
    //         eventTitle: event.title,
    //         error: err.message
    //       })
    //     }
    //   }
    // }
  } catch (error) {
    console.error("Error processing Notion page:", error)
    throw error // Re-throw to be handled by the message listener
  }
}

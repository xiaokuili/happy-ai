import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["*://*.notion.so/*"],
  all_frames: false
}

// Create loading UI element
const loadingDiv = document.createElement('div')
loadingDiv.style.cssText = `
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 10000;
  display: none;
`
loadingDiv.innerHTML = `
  <div style="display: flex; align-items: center; gap: 12px;">
    <div style="
      width: 20px;
      height: 20px;
      border: 2px solid #1f2937;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    "></div>
    <span style="color: #1f2937;">Processing Notion data...</span>
  </div>
`

// Create notification UI element
const notificationDiv = document.createElement('div')
notificationDiv.style.cssText = `
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 16px;
  background: #10B981;
  color: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 10000;
  display: none;
  transition: transform 0.3s, opacity 0.3s;
  transform: translateY(0);
  opacity: 1;
`

// Add loading animation styles
const style = document.createElement('style')
style.textContent = `
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .notification-hide {
    transform: translateY(-100%);
    opacity: 0;
  }
`
document.head.appendChild(style)
document.body.appendChild(loadingDiv)
document.body.appendChild(notificationDiv)

// Declare the timeout property on the Window interface
declare global {
  interface Window {
    notionProcessTimeout: NodeJS.Timeout;
  }
}

// Extract Notion page ID from URL and wait for page to load
async function getNotionPageId(): Promise<string | null> {
  // Wait for Notion page to fully load
  await new Promise(resolve => {
    const checkLoading = () => {
      // Check if main Notion content is loaded
      const notionFrame = document.querySelector('.notion-frame')
      const notionApp = document.querySelector('.notion-app-inner')
      
      if (notionFrame && notionApp) {
        resolve(true)
      } else {
        setTimeout(checkLoading, 100)
      }
    }
    checkLoading()
  })

  const url = window.location.href
  
  // Check if it's a valid Notion URL
  if (!url.includes('notion.so')) {
    return null
  }

  // Try to extract the 32-character page ID
  const pageIdMatch = url.match(/[a-f0-9]{32}/)
  if (pageIdMatch) {
    return pageIdMatch[0]
  }

  // Try alternative methods if the direct match fails
  const pathSegments = window.location.pathname.split('/')
  const lastSegment = pathSegments[pathSegments.length - 1]
  
  // Check if last segment contains the ID (sometimes IDs are after a hyphen)
  const hyphenParts = lastSegment.split('-')
  const potentialId = hyphenParts[hyphenParts.length - 1]
  
  if (potentialId && potentialId.length === 32 && /^[a-f0-9]{32}$/.test(potentialId)) {
    return potentialId
  }

  return null
}

function showLoading() {
  loadingDiv.style.display = 'block'
}

function hideLoading() {
  loadingDiv.style.display = 'none'
}

function showNotification(message: string, isSuccess = true) {
  notificationDiv.textContent = message
  notificationDiv.style.display = 'block'
  notificationDiv.style.background = isSuccess ? '#10B981' : '#EF4444'
  
  setTimeout(() => {
    notificationDiv.classList.add('notification-hide')
    setTimeout(() => {
      notificationDiv.style.display = 'none'
      notificationDiv.classList.remove('notification-hide')
    }, 300)
  }, 3000)
}

async function processNotionEvents() {
  try {
    const pageId = await getNotionPageId()
    
    if (!pageId) {
      return
    }

    showLoading()
    console.log("Processing Notion page ID:", pageId)
    
    const response = await chrome.runtime.sendMessage({
      type: 'PROCESS_NOTION_PAGE',
      pageId: pageId
    })
    
    console.log("Received response from background:", response)

    if (response && response.success) {
      showNotification('Successfully processed Notion page!')
    } else {
      const errorMessage = response?.error || 'Unknown error occurred'
      showNotification(`Failed to process Notion page: ${errorMessage}`, false)
    }
  } catch (err) {
    console.error("Error processing Notion events:", err)
    showNotification('Failed to process Notion page: ' + (err.message || 'Unknown error'), false)
  } finally {
    hideLoading()
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'EVENT_ADDED') {
    showNotification(`Successfully added "${message.eventTitle}" to your calendar!`)
  } else if (message.type === 'EVENT_FAILED') {
    showNotification(`Failed to add "${message.eventTitle}" to calendar`, false)
  }
})
// Add mutation observer to detect page changes
let lastProcessTime = 0; // Track last process time for throttling
const THROTTLE_DELAY = 2000; // Minimum time between processes
const DEBOUNCE_DELAY = 1000; // Delay for debouncing

const observer = new MutationObserver((mutations) => {
  // Filter out mutations from our UI elements
  const hasRelevantChanges = mutations.some(mutation => {
    const target = mutation.target as HTMLElement
    return target !== loadingDiv && 
           target !== notificationDiv &&
           !loadingDiv.contains(target) &&
           !notificationDiv.contains(target)
  })

  if (hasRelevantChanges) {
    const now = Date.now();
    
    // Throttle check
    if (now - lastProcessTime < THROTTLE_DELAY) {
      return; // Skip if too soon after last process
    }

    // Debounce the processing
    clearTimeout(window.notionProcessTimeout);
    window.notionProcessTimeout = setTimeout(() => {
      lastProcessTime = Date.now();
      processNotionEvents();
    }, DEBOUNCE_DELAY);
  }
})

// Start observing changes
observer.observe(document.body, {
  childList: true,
  subtree: true
})

// Initial processing
processNotionEvents()
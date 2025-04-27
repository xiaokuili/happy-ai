import type { TodoEvent } from "./types";   
import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

dotenv.config();

interface NotionLine {
  content: string;
  dates: Date[];
  text: string;
}

// Initialize Notion client
const notion = new Client({
  auth: "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",
});



export async function getNotionContent(pageId: string): Promise<NotionLine[]> {
  try {
    // Fetch page content from Notion API
    const response = await notion.pages.retrieve({
      page_id: pageId
    });

    const notionLines: NotionLine[] = [];

    // Get the page content
    if ('properties' in response) {
      // Extract text content from relevant properties
      for (const [_, property] of Object.entries(response.properties)) {
        if (property.type === 'rich_text' || property.type === 'title') {
          const text = property[property.type]
            .map(textObj => textObj.plain_text)
            .join('');

          if (text) {
            const parsedLine = parseNotionLine(text);
            notionLines.push(parsedLine);
          }
        }
      }
    }

    // Also get child blocks
    const blocks = await notion.blocks.children.list({
      block_id: pageId,
    });

    // Process each block from the response
    for (const block of blocks.results) {
      if ('paragraph' in block) {
        const text = block.paragraph.rich_text
          .map(textObj => textObj.plain_text)
          .join('');
          
        if (text) {
          const parsedLine = parseNotionLine(text);
          notionLines.push(parsedLine);
        }
      }
    }

    return notionLines;
  } catch (error) {
    console.error('Error fetching Notion content:', error);
    throw error;
  }
}

export async function handleNotionPage(pageId: string): Promise<TodoEvent[]> {
  // Get notion content from page
  const notionLines = await getNotionContent(pageId);
  
  // Convert NotionLines to TodoEvents
  const todoEvents = notionLines
    .map(line => createTodoEventFromNotion(line))
    .filter((event): event is TodoEvent => event !== null);
  
  return todoEvents;
}




export function parseNotionLine(line: string): NotionLine {
  const result: NotionLine = {
    content: line,
    dates: [],
    text: line
  };

  // Match @date patterns like "@2024-01-20" or "@2024/01/20" or "@2024.01.20"
  const datePattern = /@(\d{4}[-./]\d{2}[-./]\d{2})/g;
  let match;

  while ((match = datePattern.exec(line)) !== null) {
    // Convert matched date string to Date object
    const dateStr = match[1].replace(/[./]/g, '-'); // Normalize separators to '-'
    const date = new Date(dateStr);
    
    if (!isNaN(date.getTime())) {
      result.dates.push(date);
      // Remove the date from text
      result.text = result.text.replace(match[0], '').trim();
    }
  }

  return result;
}

export function createTodoEventFromNotion(notionLine: NotionLine): TodoEvent | null {
  if (notionLine.dates.length === 0) {
    return null;
  }

  // Sort dates to use earliest as start and latest as end
  const sortedDates = [...notionLine.dates].sort((a, b) => a.getTime() - b.getTime());

  return {
    title: notionLine.text,
    description: notionLine.content,
    startDate: sortedDates[0],
    endDate: sortedDates[sortedDates.length - 1] || sortedDates[0]
  };
}

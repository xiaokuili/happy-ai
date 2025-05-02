import type { TodoEvent } from "./types";
import { Client } from '@notionhq/client';
import {
  ListBlockChildrenResponse,
  BlockObjectResponse,
  PartialBlockObjectResponse,
  ToDoBlockObjectResponse
} from "@notionhq/client/build/src/api-endpoints";


interface NotionLine {
  content: string;
  date: Date;
  text: string;
}

// Initialize Notion client
const notion = new Client({
  auth: "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",
});

function isTodoBlock(block: (PartialBlockObjectResponse | BlockObjectResponse)): boolean {
  const fullBlock = block as BlockObjectResponse;
  if (fullBlock.type == "to_do") {
    return true;
  }
  return false;
}

export async function getNotionContent(pageId: string): Promise<NotionLine[]> {
  try {

    let notionLines: NotionLine[] = [];
    // Also get child blocks
    const blocks: ListBlockChildrenResponse = await notion.blocks.children.list({
      block_id: pageId,
    });
    // Process each block from the response
    for (const block of blocks.results) {
      if (isTodoBlock(block)) {
        const todoBlock = block as ToDoBlockObjectResponse;
        const todos = todoBlock.to_do['rich_text'];
        for (const todo of todos) {
          const parsedLine = parseNotionLine(todo.plain_text);
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
  console.log("Notion lines:", notionLines);
  // Convert NotionLines to TodoEvents
  const todoEvents = notionLines
    .map(line => createTodoEventFromNotion(line))
    .filter((event): event is TodoEvent => event !== null);

  return todoEvents;
}




export function parseNotionLine(line: string): NotionLine {
  const result: NotionLine = {
    content: line,
    date: new Date(),
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
      result.date = date;
      // Remove the date from text
      result.text = result.text.replace(match[0], '').trim();
    }
  }

  return result;
}

export function createTodoEventFromNotion(notionLine: NotionLine): TodoEvent | null {
  if (notionLine.date === null) {
    notionLine.date = new Date();
  }


  return {
    title: notionLine.text,
    description: notionLine.content,
    startDate: new Date(),
    endDate: notionLine.date
  };
}

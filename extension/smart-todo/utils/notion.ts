import type { TodoEvent } from "./types";
import { Client } from '@notionhq/client';

import type {
  ListBlockChildrenResponse,
  BlockObjectResponse,
  PartialBlockObjectResponse,
  ToDoBlockObjectResponse
} from "@notionhq/client/build/src/api-endpoints";

interface NotionLine {
  content: string;
  date: string;
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
        console.log("Todos:", todos);
        let todoText = ""
        for (const todo of todos) {
          if (todo.type == 'mention') {
            todoText += "@" + todo.plain_text;
          } else {
            todoText += todo.plain_text;
          }
        }
        const parsedLine = parseNotionLine(todoText);
        notionLines.push(parsedLine);
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
    .filter((event): event is TodoEvent => event.title !== null)


  return todoEvents;
}




export function parseNotionLine(line: string): NotionLine {
  const result: NotionLine = {
    content: line,
    date: new Date().toISOString(),
    text: line
  };
  const parts = line.split('@');
  result.text = parts[0]?.trim();
  result.date = parts[1]?.trim();

  return result;
}

export function createTodoEventFromNotion(notionLine: NotionLine): TodoEvent | null {
  if (notionLine.date === null) {
    notionLine.date = new Date().toISOString();
  }


  return {
    title: notionLine.text,
    description: notionLine.content,
    startDate: new Date(),
    endDate: new Date(notionLine.date)
  };
}

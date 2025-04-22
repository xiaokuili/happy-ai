import type { Task, UnscheduledTask, CalendarConfig } from './types';
import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as fs from 'fs/promises';
import * as path from 'path';

export class CalendarService {
  private calendar: calendar_v3.Calendar;
  private config: CalendarConfig;
  
  constructor(auth: OAuth2Client, config: CalendarConfig) {
    this.calendar = google.calendar({ version: 'v3', auth });
    this.config = config;
  }

  async addTask(task: Task): Promise<void> {
    if (!task.dueDate) {
      await this.storeUnscheduledTask(task);
      return;
    }

    if (this.config.googleCalendarId) {
      await this.addToGoogleCalendar(task);
    }
  }

  private async addToGoogleCalendar(task: Task): Promise<void> {
    if (!this.config.googleCalendarId) return;

    const event = {
      summary: task.description,
      start: {
        dateTime: task.dueDate?.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: new Date(task.dueDate!.getTime() + (task.estimatedTime || 60) * 60000).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      description: `Status: ${task.status}\nEstimated Time: ${task.estimatedTime || 'Not set'} minutes`,
    };

    const response = await this.calendar.events.insert({
      calendarId: this.config.googleCalendarId,
      requestBody: event,
    });

    task.googleCalendarEventId = response.data.id || undefined;
  }

  private async storeUnscheduledTask(task: Task): Promise<void> {
    const unscheduledTask: UnscheduledTask = {
      task,
      createdAt: new Date(),
    };

    const storageDir = path.dirname(this.config.unscheduledTasksStoragePath);
    await fs.mkdir(storageDir, { recursive: true });

    const existingTasks = await this.getUnscheduledTasks();
    existingTasks.push(unscheduledTask);

    await fs.writeFile(
      this.config.unscheduledTasksStoragePath,
      JSON.stringify(existingTasks, null, 2)
    );
  }

  async getUnscheduledTasks(): Promise<UnscheduledTask[]> {
    try {
      const content = await fs.readFile(this.config.unscheduledTasksStoragePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return [];
    }
  }

  async getTasksByDay(date: Date): Promise<Task[]> {
    if (!this.config.googleCalendarId) {
      return [];
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const response = await this.calendar.events.list({
      calendarId: this.config.googleCalendarId,
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    return response.data.items?.map(event => ({
      id: event.id!,
      description: event.summary!,
      dueDate: new Date(event.start?.dateTime || event.start?.date!),
      status: this.parseStatusFromDescription(event.description || ''),
      estimatedTime: this.parseEstimatedTimeFromDescription(event.description || ''),
      googleCalendarEventId: event.id,
    } as Task)) || [];
  }

  private parseStatusFromDescription(description?: string): string {
    if (!description) return 'TODO';
    const match = description.match(/Status: (.*)/);
    return match?.[1] || 'TODO';
  }

  private parseEstimatedTimeFromDescription(description?: string): number | undefined {
    if (!description) return undefined;
    const match = description.match(/Estimated Time: (\d+)/);
    return match ? parseInt(match[1]) : undefined;
  }
}






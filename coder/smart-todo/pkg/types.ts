export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE'
}

export interface Task {
  id: string;
  description: string;
  dueDate?: Date;
  status: TaskStatus;
  estimatedTime?: number; // in minutes
  subTasks?: Task[];
  parentId?: string;
  googleCalendarEventId?: string;
}

export interface UnscheduledTask {
  task: Task;
  createdAt: Date;
}

export interface CalendarConfig {
  googleCalendarId?: string;
  unscheduledTasksStoragePath: string;
} 
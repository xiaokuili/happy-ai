interface TodoEvent {
    title: string
    description?: string
    startDate: Date
    endDate: Date
    priority?: 'low' | 'medium' | 'high'
  }

export type { TodoEvent };
# Smart Todo Plugin

一个智能的待办事项插件，支持与 Google Calendar 集成。

## 功能特点

- 支持创建具有层级结构的待办事项
- 自动同步到 Google Calendar
- 支持未计划任务的临时存储
- 按天查看任务列表

## 数据结构

- Task（任务）
  - 描述（description）
  - 截止日期（dueDate）
  - 状态（status）
  - 预计时间（estimatedTime）
  - 子任务（subTasks）

## 使用方法

1. 安装依赖：
```bash
npm install
```

2. 配置 Google Calendar API：
   - 在 Google Cloud Console 创建项目
   - 启用 Google Calendar API
   - 创建 OAuth 2.0 凭据
   - 下载凭据文件

3. 构建项目：
```bash
npm run build
```

## API 示例

```typescript
import { CalendarService } from './pkg/calendar';
import { OAuth2Client } from 'google-auth-library';

// 初始化服务
const auth = new OAuth2Client({
  // 你的 Google OAuth 配置
});

const calendarService = new CalendarService(auth, {
  googleCalendarId: 'your_calendar_id',
  unscheduledTasksStoragePath: './unscheduled-tasks.json'
});

// 添加任务
await calendarService.addTask({
  id: '1',
  description: '完成项目文档',
  dueDate: new Date('2024-02-20'),
  status: 'TODO',
  estimatedTime: 120 // 分钟
});

// 获取某天的任务
const tasks = await calendarService.getTasksByDay(new Date());
```

## 注意事项

- 请确保正确配置 Google Calendar API 的权限
- 未设置截止日期的任务会被存储在本地文件中
- 时间估算单位为分钟

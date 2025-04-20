import { sql } from "drizzle-orm";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

// 列表表 - 存储从网站抓取的列表页数据
export const listTable = sqliteTable("list_table", {
  id: int().primaryKey({ autoIncrement: true }), // 主键ID，自增
  siteName: text().notNull(), // 网站名称
  siteUrl: text().notNull(), // 网站URL
  detailUrl: text().notNull().unique(), // 详情页URL，不能重复
  detailTitle: text().notNull(), // 详情页标题
  detailDesc: text(), // 详情页描述
  detailTime: text(), // 详情页时间
  status: text().notNull().default('pending'), // 状态, pending, success, failed
  createdAt: text().notNull().default(sql`(CURRENT_DATE)`), // 创建时间
  updatedAt: text().notNull().default(sql`(CURRENT_DATE)`), // 更新时间
});

// 详情表 - 存储从详情页抓取的具体内容
export const detailTable = sqliteTable("detail_table", {
  id: int().primaryKey({ autoIncrement: true }), // 主键ID，自增
  title: text().notNull(), // 文章标题
  content: text().notNull(), // 文章内容
  author: text(), // 作者
  publishTime: text(), // 发布时间
  attachments: text(), // 其他格式数据，以JSON字符串形式存储
  createdAt: text().notNull().default(sql`(CURRENT_DATE)`), // 创建时间
  updatedAt: text().notNull().default(sql`(CURRENT_DATE)`), // 更新时间
  url: text().notNull().unique(), // URL，文章链接
});

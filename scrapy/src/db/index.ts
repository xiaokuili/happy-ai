import 'dotenv/config';
import { drizzle } from 'drizzle-orm/libsql';
import { listTable, detailTable } from './schema/schema';
import { desc, sql, eq } from 'drizzle-orm';


const db = drizzle(process.env.DB_FILE_NAME!);


const getLastUrl = async () => {
  const lastUrl = await db.select().from(listTable).orderBy(desc(listTable.updatedAt)).limit(1);
  return lastUrl[0]?.detailUrl;
}


const saveList = async (list: any) => {
  const existingRecord = await db.select().from(listTable).where(eq(listTable.detailUrl, list.detailUrl)).get();
  
  if (existingRecord) {
    await db.update(listTable)
      .set({
        ...list,
        updatedAt: sql`(CURRENT_DATE)`
      })
      .where(eq(listTable.detailUrl, list.detailUrl));
  } else {
    await db.insert(listTable).values(list);
  }
}

const saveDetail = async (detail: any) => {
  try {
    const existingRecord = await db.select().from(detailTable).where(eq(detailTable.url, detail.url)).get();

    // 验证必填字段
    const requiredFields = ['title', 'content', 'url'];
    for (const field of requiredFields) {
      if (!detail[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (existingRecord) {
      await db.update(detailTable)
        .set({
          ...detail,
          updatedAt: sql`(CURRENT_DATE)`
        })
        .where(eq(detailTable.url, detail.url));
      console.log(`✅ Updated detail record for URL: ${detail.url}`);
    } else {
      console.log(`✅ Inserted new detail record for URL: ${detail.url}`);
      await db.insert(detailTable).values(detail);
    }
  } catch (error) {
    console.error(`❌ Error saving detail for URL ${detail.url}:`, error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    throw error; // 重新抛出错误以便上层处理
  }
}

const updateListStatus = async (url: string, status: string) => {
  await db.update(listTable)
    .set({
      status: status
    })
    .where(eq(listTable.detailUrl, url));
}

const getListByStatus = async (status: string, limit: number = 10) => {
  return await db.select().from(listTable).where(eq(listTable.status, status)).limit(limit);
}

export { getLastUrl, saveList, saveDetail , db, updateListStatus, getListByStatus};
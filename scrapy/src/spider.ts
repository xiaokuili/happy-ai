import { getBrowser, createPage, shutdownBrowser } from "./browser";
import { getLastUrl, saveList, getListByStatus, updateListStatus, saveDetail } from "./db";
import { Status } from "./cons";
import { url } from "inspector";
import { ElementHandle } from "playwright";

const URL = 'https://www.mafengwo.cn/gonglve/';
const WEBSITE_NAME = '马蜂窝';
const TIMEOUT = 5000;

// list config 
const SCROLL_DELAY = 1000;
const SCROLL_STEP = 10;
const SCROLL_HEIGHT= 200;
const ListSelector = {
  waitForItems: '.gl-post',
  items: '.feed-item',
  title: '.title',
  href: 'a',
}

// detail config
const PER_LIMIT_NUM = 2;
const TOTAL_NUM = 2;
const DETAIL_TIMEOUT = 60000;

const DETAIL_SELECTOR = {
  waitForItems: 'h1',
  title: 'h1',
  content: ['._j_content_box'],
}

const MafengwoListSpider = async () => {
  console.log('🕷️ 开始爬取列表页...');
  // 创建列表页面
  const listPage = await createPage();
  await listPage.goto(URL, {waitUntil: 'load'});
  await listPage.waitForSelector(ListSelector.waitForItems, {timeout: TIMEOUT});
  const lastUrl = await getLastUrl() || '';
  console.log(`📍 上次爬取到: ${lastUrl}`);

  const result: any[] = [];
  
  // 滚动加载更多内容
  for (let i = 0; i < SCROLL_STEP; i++) {
    console.log(`🔄 正在滚动加载第 ${i + 1}/${SCROLL_STEP} 页`);
    await listPage.evaluate((height) => {
      window.scrollBy(0, height);
    }, SCROLL_HEIGHT);
    await listPage.waitForTimeout(SCROLL_DELAY);
    const items = await listPage.$$(ListSelector.items);
    console.log(`📑 当前页面共有 ${items.length} 个项目`);
    for (const i of items) {
      const title = await i.$(ListSelector.title);
      const href = await i.$(ListSelector.href);
      const titleText = await title?.evaluate(el =>
        el.textContent?.replace(/\s+/g, ' ').trim() || ''
      );      
      const hrefText = await href?.evaluate(el => (el as HTMLAnchorElement).href) || '';

      // 检查标题是否已存在
      const isDuplicate = result?.some((r: any) => r.title === titleText);
      const isMatch = hrefText.match(/https:\/\/www\.mafengwo\.cn\/i\/(\d+)\.html/);
      if (!isDuplicate && isMatch) {
        result.push({
          title: titleText,
          href: hrefText
        });
        console.log(`💾 存储列表项: ${titleText} - ${hrefText}`);
        await saveList({
          siteName: WEBSITE_NAME,
          siteUrl: URL,
          detailUrl: hrefText,
          detailTitle: titleText,
          detailDesc: '',
          detailTime: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } else {
        console.log(`⏭️ 跳过重复项: ${titleText}`);
      }

      if (hrefText === lastUrl) {
        console.log('🔚 到达上次爬取位置，停止爬取');
        await listPage.close();
        await shutdownBrowser();
        return;
      }

      if (result.length >= TOTAL_NUM) {
        console.log(`🔚 达到最大爬取数量 ${TOTAL_NUM}，停止爬取`);
        await listPage.close();
        await shutdownBrowser();
        return;
      }
    }
  }
  console.log(`✅ 列表爬取完成，共爬取 ${result.length} 条数据`);

  await listPage.close();
  await shutdownBrowser();
}

const MafengwoDetailSpider = async () => {
  console.log('🕷️ 开始爬取详情页...');

  let total = 0;
  while (true) {
    const list = await getListByStatus(Status.pending, PER_LIMIT_NUM);
    
   
    if (list.length === 0) {
      console.log('🔚 没有待处理的数据，停止爬取');
      break;
    } 
    total += list.length;
    console.log(`📊 当前批次待处理: ${list.length} 条，总计处理: ${total} 条`);
    
    if (total > TOTAL_NUM) {
      console.log('🔚 达到最大处理数量，停止爬取');
      break;
    }

    // 创建所有页面的 Promise 数组
    const pagePromises = list.map(async (item) => {
      console.log(`🔍 正在处理: ${item.detailUrl}`);
      const page = await createPage();
      
      try {
        await page.goto(item.detailUrl, {waitUntil: 'load', timeout: DETAIL_TIMEOUT});
        await page.waitForSelector(DETAIL_SELECTOR.waitForItems, {timeout: DETAIL_TIMEOUT});

        const title = await page.$(DETAIL_SELECTOR.title);
        let content: ElementHandle<SVGElement | HTMLElement> | null = null;
        let contentText = '';

        // Find first matching content selector
        for (const css of DETAIL_SELECTOR.content) {
          content = await page.$(css);
          if (content) {
            contentText = await content.evaluate(el => el.innerHTML?.replace(/\s+/g, ' ').trim() || '') || '';
            break;
          }
        }

        const titleText = await title?.evaluate(el =>
          el.textContent?.replace(/\s+/g, ' ').trim() || ''
        ) || '';  // 添加默认空字符串

        // 修改附件列表的处理
        let attachments: string[] = [];
        if (content) {
          attachments = await content.evaluate(el => {
            const links = el.querySelectorAll('img');
            return Array.from(links)
              .map(link => (link as HTMLImageElement).src)
              .filter(href => href && href.length > 0); // 过滤掉空值
          }) || [];
        }


        console.log(`💾 存储详情: ${titleText}`);
        await saveDetail({
          title: titleText,
          content: contentText || 'css选择器错误，请检查',
          url: item.detailUrl,
          attachments: JSON.stringify(attachments),
       
    
        });
        await updateListStatus(item.detailUrl, Status.success);
        console.log(`✅ 处理成功: ${item.detailUrl}`);
      } catch (error) {
        console.error(`❌ 处理失败: ${item.detailUrl}`, error);
        await updateListStatus(item.detailUrl, Status.failed);
      } finally {
        await page.close();
      }
    });

    // 等待所有页面处理完成
    await Promise.all(pagePromises);
  }

  console.log('🎉 详情页爬取完成');

  await shutdownBrowser();
  process.exit(0);  // 确保程序结束

}

export { MafengwoListSpider, MafengwoDetailSpider };

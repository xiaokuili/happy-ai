import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';
import * as cheerio from 'cheerio';

import dotenv from 'dotenv';

import { getLastUrl, saveList, getListByStatus, updateListStatus, saveDetail } from "./db";
import {  proxyUrl } from "./proxy";
import { cookies }  from "./cookies";
import { Status } from "./cons";



dotenv.config();
// base config 
const URL = 'https://www.mafengwo.cn/gonglve/';
const WEBSITE_NAME = '马蜂窝';

// proxy 
let proxyAgent: HttpsProxyAgent<string>;
if (proxyUrl !== "") {
  proxyAgent = new HttpsProxyAgent(proxyUrl);
}

// spider list config 
const MAX_PAGE = 30;

const ListSelector = {
  items: '.feed-item',
  title: '.title',
  href: 'a',
}

// spider detail config
const DETAIL_SELECTOR = {
  title: 'h1',
  content: ['._j_content_box'],
}



const MafengwoListSpider = async () => {
  console.log('🕷️ 开始爬取列表页...');
  const lastUrl = await getLastUrl() || '';
  console.log(`📍 上次爬取到: ${lastUrl}`);

  const urls: any[] = [];
  let page = 1;

  while (page <= MAX_PAGE) {
    console.log(`🔄 正在爬取第 ${page} 页`);
    
    const response = await fetch(URL, {
      method: 'POST',
      agent: proxyAgent,
      headers: {
        'accept': '*/*',
        'accept-language': 'en,zh-CN;q=0.9,zh;q=0.8',
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'origin': 'https://www.mafengwo.cn',
        'priority': 'u=1, i',
        'referer': 'https://www.mafengwo.cn/gonglve/',
        'sec-ch-ua': '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
        'x-requested-with': 'XMLHttpRequest',
        'cookie': cookies
      },
      body: `page=${page}`,
    });

    const html = await response.text();
    const $ = cheerio.load(html);
    
    const items = $(ListSelector.items);
    console.log(`📑 当前页面共有 ${items.length} 个项目`);


    items.each((_, item) => {
      const $item = $(item);
      const title = $item.find(ListSelector.title).text().replace(/\s+/g, ' ').trim();
      const href = $item.find(ListSelector.href).attr('href') || '';
      const fullHref = href.startsWith('http') ? href : `https://www.mafengwo.cn${href}`;
      // 检查标题是否已存在
      const isDuplicate = urls?.some((r: any) => r.title === title);
      const isMatch = fullHref.match(/https:\/\/www\.mafengwo\.cn\/i\/(\d+)\.html/);
      if (!isDuplicate && isMatch) {
        urls.push(fullHref);
        saveList({
          siteName: WEBSITE_NAME,
          siteUrl: 'https://www.mafengwo.cn',
          detailUrl: fullHref,
          detailTitle: title,
          detailDesc: '',
          detailTime: '',
          status: 'pending'
        });
        console.log(`💾 存储列表项: ${title} - ${fullHref}`);
      }
      
    });
  

    if (items.length === 0) {
      console.log('🔚 没有更多数据，停止爬取');
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    page++;
  }

  console.log(`✅ 列表爬取完成，共爬取 ${urls.length} 条数据`);
}


const MafengwoDetailSpider = async () => {
  console.log('🕷️ 开始爬取详情页...');

 
  let failedCount = 0;
  let successCount = 0;
  outerLoop: while (true) {
    let items = await getListByStatus(Status.pending);
    console.log(`📑 待处理详情页数量: ${items.length}`);

    if (items.length === 0) {
      console.log('✅ 没有待处理的详情页');
      break outerLoop;
    }
    for (const item of items) {
      try {
        console.log(`🔍 正在处理: ${item.detailUrl}`);
      
        const response = await fetch(item.detailUrl, {
          // agent: proxyAgent,
          headers: {
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'accept-language': 'en,zh-CN;q=0.9,zh;q=0.8',
            'cache-control': 'max-age=0',
            'priority': 'u=0, i',
            'referer': item.detailUrl,
            'sec-ch-ua': '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'same-origin',
            'upgrade-insecure-requests': '1',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
            'cookie': cookies
          }
        });

        const html = await response.text();
        const $ = cheerio.load(html);

        // 获取标题
        const title = $(DETAIL_SELECTOR.title).text().trim();
        
        // 获取内容
        let content = '';
        for (const selector of DETAIL_SELECTOR.content) {
          const contentElement = $(selector);
          if (contentElement.length > 0) {
            content = contentElement.html() || '';
            break;
          }
        }

        // 获取图片
        const attachments = $('img')
          .map((_, el) => $(el).attr('data-src'))
          .get()
          .filter(src => src && src.length > 0);

        console.log(`💾 存储详情: ${title}`);
        await saveDetail({
          title,
          content: content || 'css选择器错误，请检查',
          url: item.detailUrl,
          attachments: JSON.stringify(attachments),
        });

        await updateListStatus(item.detailUrl, Status.success);
        console.log(`✅ 处理成功: ${item.detailUrl}`);
        successCount++;
      } catch (error) {
        console.error(`❌ 处理失败: ${item.detailUrl}`, error);
        await updateListStatus(item.detailUrl, Status.failed);
        failedCount++;
      }
      await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
      if (failedCount > 10) {
        break outerLoop;
      }
    }
}

  process.exit(0);
}



export { MafengwoListSpider, MafengwoDetailSpider };

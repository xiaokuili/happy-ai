import { getLastUrl, saveList, getListByStatus, updateListStatus, saveDetail } from "./db";
import FireCrawlApp from '@mendable/firecrawl-js';
import dotenv from 'dotenv';
import * as cheerio from 'cheerio';

dotenv.config();

const URL = 'https://www.mafengwo.cn/gonglve/';
const WEBSITE_NAME = '马蜂窝';
const TIMEOUT = 5000;

// list config 
const MAX_PAGE = 30;

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
  const lastUrl = await getLastUrl() || '';
  console.log(`📍 上次爬取到: ${lastUrl}`);

  const urls: any[] = [];
  let page = 1;

  while (page <= MAX_PAGE) {
    console.log(`🔄 正在爬取第 ${page} 页`);
    
    const response = await fetch(URL, {
      method: 'POST',
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
        'cookie': 'PHPSESSID=gdjbnp9qrddl3j7d6kqnl4ch35; mfw_uuid=6807053a-c114-ba6a-a446-4f00496594c3; oad_n=a%3A3%3A%7Bs%3A3%3A%22oid%22%3Bi%3A1029%3Bs%3A2%3A%22dm%22%3Bs%3A15%3A%22www.mafengwo.cn%22%3Bs%3A2%3A%22ft%22%3Bs%3A19%3A%222025-04-22+10%3A55%3A54%22%3B%7D; __mfwc=direct; Hm_lvt_8288b2ed37e5bc9b4c9f7008798d2de0=1745290558; HMACCOUNT=0221A67C8D535281; uva=s%3A92%3A%22a%3A3%3A%7Bs%3A2%3A%22lt%22%3Bi%3A1745290557%3Bs%3A10%3A%22last_refer%22%3Bs%3A24%3A%22https%3A%2F%2Fwww.mafengwo.cn%2F%22%3Bs%3A5%3A%22rhost%22%3BN%3B%7D%22%3B; __mfwurd=a%3A3%3A%7Bs%3A6%3A%22f_time%22%3Bi%3A1745290557%3Bs%3A9%3A%22f_rdomain%22%3Bs%3A15%3A%22www.mafengwo.cn%22%3Bs%3A6%3A%22f_host%22%3Bs%3A3%3A%22www%22%3B%7D; __mfwuuid=6807053a-c114-ba6a-a446-4f00496594c3; bottom_ad_status=0; __omc_chl=; __omc_r=; __mfwa=1745290556206.23964.4.1745305385881.1745314352503; __mfwlv=1745314352; __mfwvn=3; __mfwb=32fec600defd.5.direct; __mfwlt=1745314562; Hm_lpvt_8288b2ed37e5bc9b4c9f7008798d2de0=1745314565; w_tsfp=ltvuV0MF2utBvS0Q7a/qlU6mHjAlcD04h0wpEaR0f5thQLErU5mB1IV7u8P/OHHf5sxnvd7DsZoyJTLYCJI3dwNHR8jDcNhFjwjDmoQtit0UVBRiRZjbC1VMIb4j7TVCeHhCNxS00jA8eIUd379yilkMsyN1zap3TO14fstJ019E6KDQmI5uDW3HlFWQRzaLbjcMcuqPr6g18L5a5WuP4VL7Ll5yUb1B1hGWhnsXCXt25ES7d7pVMxyqcMitSqA='
      },
      body: `page=${page}`
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

  const app = new FireCrawlApp({apiKey: process.env.FIRECRAWL_API_KEY || ''});

  const scrapeResult = await app.scrapeUrl("https://www.mafengwo.cn/i/11891906.html", {
    formats: [ "markdown" ],
    actions: [
      {
        type: 'executeJavascript',
        script: 'window.scrollTo(0, document.body.scrollHeight);'
      },
      {
        type: 'wait',
        milliseconds: 3000,
      },
      {
        type: 'executeJavascript',
        script: 'window.scrollTo(0, document.body.scrollHeight);'
      },
      {
        type: 'wait',
        milliseconds: 3000,
      },
    ]
  });
  console.log(scrapeResult);
}

export { MafengwoListSpider, MafengwoDetailSpider };

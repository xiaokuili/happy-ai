import { Browser, BrowserContext, Route, Request as PlaywrightRequest, Page } from 'playwright';
import UserAgent from 'user-agents';
import { chromium } from 'playwright-extra';
import StealthPlugin from "puppeteer-extra-plugin-stealth"

const BLOCK_MEDIA = (process.env.BLOCK_MEDIA || 'False').toUpperCase() === 'TRUE';
const PROXY_SERVER = process.env.PROXY_SERVER || null;
const PROXY_USERNAME = process.env.PROXY_USERNAME || null;
const PROXY_PASSWORD = process.env.PROXY_PASSWORD || null;
const HEADLESS = (process.env.HEADLESS || 'True').toUpperCase() === 'TRUE';

const AD_SERVING_DOMAINS = [
  'doubleclick.net',
  'adservice.google.com', 
  'googlesyndication.com',
  'googletagservices.com',
  'googletagmanager.com',
  'google-analytics.com',
  'adsystem.com',
  'adservice.com',
  'adnxs.com',
  'ads-twitter.com',
  'facebook.net',
  'fbcdn.net',
  'amazon-adsystem.com'
];

interface UrlModel {
  url: string;
  wait_after_load?: number;
  timeout?: number;
  headers?: { [key: string]: string };
  check_selector?: string;
}

let browser: Browser | undefined;
let context: BrowserContext | undefined;
let initialized = false;
let initializationPromise: Promise<void> | null = null;

chromium.use(StealthPlugin())

const ensureBrowserInitialized = async () => {
  if (initializationPromise) return initializationPromise;
  if (initialized) return Promise.resolve();

  initializationPromise = (async () => {
    console.log('🌐 正在初始化浏览器...');
    browser = await chromium.launch({
      headless: HEADLESS,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox', 
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled',
        '--lang=zh-CN,zh'
      ]
    });

    const userAgent = new UserAgent().toString();
    const viewport = { width: 1280, height: 800 };

    const contextOptions: any = {
      userAgent,
      viewport,
    };

    if (PROXY_SERVER && PROXY_USERNAME && PROXY_PASSWORD) {
      contextOptions.proxy = {
        server: PROXY_SERVER,
        username: PROXY_USERNAME,
        password: PROXY_PASSWORD,
      };
    } else if (PROXY_SERVER) {
      contextOptions.proxy = {
        server: PROXY_SERVER,
      };
    }

    context = await browser.newContext(contextOptions);

    if (BLOCK_MEDIA) {
      await context.route('**/*.{png,jpg,jpeg,gif,svg,mp3,mp4,avi,flac,ogg,wav,webm}', async (route: Route, request: PlaywrightRequest) => {
        await route.abort();
      });
    }

    await context.route('**/*', (route: Route, request: PlaywrightRequest) => {
      const requestUrl = new URL(request.url());
      const hostname = requestUrl.hostname;

      if (AD_SERVING_DOMAINS.some(domain => hostname.includes(domain))) {
        return route.abort();
      }
      return route.continue();
    });

    initialized = true;
    console.log('✅ 浏览器初始化完成');
  })();

  return initializationPromise;
};

const getBrowser = async () => {
  await ensureBrowserInitialized();
  return { browser, context };
};

const createPage = async () => {
  await ensureBrowserInitialized();
  if (!browser || !context) throw new Error('浏览器未能正确初始化');
  return await context.newPage();
};

const shutdownBrowser = async () => {
  if (context) {
    await context.close();
  }
  if (browser) {
    await browser.close();
  }
  initialized = false;
  initializationPromise = null;
};

const scrapePage = async (page: Page, url: string, waitUntil: 'load' | 'networkidle', waitAfterLoad: number, timeout: number, checkSelector: string | undefined) => {
  console.log(`Navigating to ${url} with waitUntil: ${waitUntil} and timeout: ${timeout}ms`);

  const response = await page.goto(url, { waitUntil, timeout });

  if (waitAfterLoad > 0) {
    await page.waitForTimeout(waitAfterLoad);
  }

  if (checkSelector) {
    try {
      await page.waitForSelector(checkSelector, { timeout });
    } catch (error) {
      throw new Error('Required selector not found');
    }
  }

  let headers = null, content = await page.content();
  if (response) {
    headers = await response.allHeaders();
    const ct = Object.entries(headers).find(x => x[0].toLowerCase() === "content-type");
    if (ct && (ct[1].includes("application/json") || ct[1].includes("text/plain"))) {
      content = (await response.body()).toString("utf8");
    }
  }

  return {
    content,
    status: response ? response.status() : null,
    headers,
  };
};

// 立即开始初始化过程
ensureBrowserInitialized();

export { getBrowser, createPage, scrapePage, shutdownBrowser };

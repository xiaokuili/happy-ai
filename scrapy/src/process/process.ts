import { JSDOM } from 'jsdom';

import { getDetailsByCreatedAt } from '../db/index';
import * as fs from 'fs/promises';
import * as path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createReadStream } from 'fs';
import { existsSync } from 'fs';

interface ContentItem {
  type: 'text' | 'image'| 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  content?: string;
  src?: string;
  alt?: string;
}
function extractContent(html: string): ContentItem[] {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const contentList: ContentItem[] = [];

  // Get all content nodes in order
  const allNodes = document.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, img');

  allNodes.forEach((node) => {
    if (node.tagName.toLowerCase() === 'img') {
      contentList.push({
        type: 'image',
        src: node.getAttribute('data-src') || node.getAttribute('src') || '',
        alt: node.getAttribute('alt') || ''
      });
    } else {
      const tagName = node.tagName.toLowerCase();
      // Remove extra whitespace and normalize line breaks
      const text = (node.textContent || '')
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/\n\s+/g, '\n');
      
      // Skip empty text nodes
      if (!text) return;

      contentList.push({
        type: tagName as 'text' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6',
        content: text
      });
    }
  });

  return contentList;
}

function extractSubstring(url: string) {
  const start = url.indexOf("mafengwo.net/") + 'mafengwo.net/'.length; // 查找 "s16" 的起始索引
  const end = url.indexOf("CoUBUm");

  return url.substring(start, end); // 提取子字符串
}

function url2filename(url: string): string {
  // Use base64 encoding for reversible string conversion
  const sub_url = extractSubstring(url);

  const buffer = Buffer.from(sub_url);
  const base64 = buffer.toString('base64');
  // Take first 32 chars of base64 string to keep filename length reasonable
  const truncated = base64.slice(0, 64);
  return `./image/${truncated}.jpg`;
}

async function downloadImage(imageUrl: string): Promise<string> {
  try {
    // 下载图片
    const response = await fetch(imageUrl);
    const imageBuffer = await response.arrayBuffer();

    // 使用 url2id 生成文件名
    const localPath = url2filename(imageUrl);

    // 确保目录存在
    await fs.mkdir('./image', { recursive: true });

    // 保存文件
    await fs.writeFile(localPath, Buffer.from(imageBuffer));

    return localPath;

  } catch (error) {
    console.error('Error downloading image:', error);
    return imageUrl; // 如果失败则返回原始URL
  }
}



// Initialize S3 client for R2
const s3Client = new S3Client({
  endpoint: "https://58ac72f971b34aba8c1b6c13f06b0f4f.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: "9fd006adc946fd48e42106856b97f17f",
    secretAccessKey: "4c6e72de5b6b5f29c922aefe4b19a8573a1aa12f3ee7bde87b91594d6c599353"
  },
  region: "auto" // Cloudflare R2 uses "auto" region
});

// Update uploadToCloudflare function to use S3Client
async function uploadToCloudflare(localFilePath: string): Promise<string> {
  try {
    const fileName = path.basename(localFilePath);
    const fileStream = createReadStream(localFilePath);
    
    // Upload to R2 using S3Client
    await s3Client.send(new PutObjectCommand({
      Bucket: "travel",
      Key: fileName,
      Body: fileStream,
      ContentType: `image/${path.extname(localFilePath).substring(1)}` // Get content type from extension
    }));

    // Generate public URL
    const publicUrl = `https://travel.58ac72f971b34aba8c1b6c13f06b0f4f.r2.cloudflarestorage.com/${fileName}`;
    
    // Clean up local file after successful upload
    // await fs.unlink(localFilePath);
    
    return publicUrl;
  } catch (error) {
    console.error('Error uploading to Cloudflare:', error);
    throw error;
  }
}

// 处理单个图片的下载和上传
async function processOneImage(item: ContentItem): Promise<{success: boolean, newSrc?: string}> {
  if (!item.src) {
    return { success: false };
  }

  let localPath = url2filename(item.src);

  // Try to get existing file or download new one
  try {
    if (!existsSync(localPath)) {

      localPath = await downloadImage(item.src);
      if (localPath === item.src) {
        return { success: false };
      }
    }

    // Upload to Cloudflare
    const newSrc = await uploadToCloudflare(localPath);
    return { success: true, newSrc };

  } catch (error) {
    console.error(`❌ Error processing image ${item.src}:`, error);
    // Cleanup downloaded file if exists
    if (localPath) {
      try {
        await fs.unlink(localPath);
      } catch (cleanupError) {
        console.warn(`Warning: Could not cleanup file ${localPath}:`, cleanupError);
      }
    }
    return { success: false };
  }
}

// 处理状态和日志
function createProgressTracker(totalImages: number) {
  let processedCount = 0;
  
  return {
    increment() {
      processedCount++;
    },
    logSuccess(originalSrc: string, newSrc: string) {
      console.log(`✅ Successfully processed image ${processedCount}/${totalImages}: ${originalSrc} -> ${newSrc}`);
    },
    logFailure(src: string) {
      console.warn(`⚠️ Failed to process image, keeping original: ${src}`);
    }
  };
}
function extractCityFromTitle(title: string): string | null {
  const validCities = [
    { en: 'Beijing', cn: '北京' },
    { en: 'Chengdu', cn: '成都' },
    { en: 'Chongqing', cn: '重庆' },
    { en: 'Dalian', cn: '大连' },
    { en: 'Dunhuang', cn: '敦煌' },
    { en: 'Guangzhou', cn: '广州' },
    { en: 'Guilin', cn: '桂林' },
    { en: 'Hangzhou', cn: '杭州' },
    { en: 'Huangshan', cn: '黄山' },
    { en: 'Kunming', cn: '昆明' },
    { en: 'Lhasa', cn: '拉萨' },
    { en: 'Lijiang', cn: '丽江' },
    { en: 'Luoyang', cn: '洛阳' },
    { en: 'Nanjing', cn: '南京' },
    { en: 'Qingdao', cn: '青岛' },
    { en: 'Shanghai', cn: '上海' },
    { en: 'Shenzhen', cn: '深圳' },
    { en: 'Suzhou', cn: '苏州' },
    { en: 'Urumqi', cn: '乌鲁木齐' },
    { en: 'Wuhan', cn: '武汉' },
    { en: 'Xiamen', cn: '厦门' },
    { en: 'Xian', cn: '西安' },
    { en: 'Zhangjiajie', cn: '张家界' }
  ];

  // Find the first matching city
  for (const city of validCities) {
    if (title.includes(city.cn)) {
      return city.en;
    }
  }
  
  return null;
}



async function processImages(contentItems: ContentItem[]): Promise<{items: ContentItem[], status: 'success' | 'failure'}> {

  const processedItems: ContentItem[] = [];
  for (const item of contentItems) {
    if (item.type === 'image') {
      const result = await processOneImage(item);
      if (result.success && result.newSrc ) {
      
        processedItems.push({
          ...item,
          src: result.newSrc
        });
      } else {
        return {
          items: processedItems,
          status: 'failure',
        }
      }
    } else {
      processedItems.push(item);
    }
  }

  return {
    items: processedItems,
    status: 'success'
  }
}

const process = async (limit: number = 10, offset: number = 0) => {
  console.log(`Processing ${limit} articles from ${offset} to ${offset + limit}`);
  let failedCount = 0;
  const details = await getDetailsByCreatedAt('2025-04-23', limit, offset);

  for (const detail of details) {
    const content = extractContent(detail.content);
    
    // 1. Process and track image downloads
    const imageItems = content.filter(item => item.type === 'image');
    const totalImages = imageItems.length;
    console.log(`Found ${totalImages} images to process`);
    
    // 2. Process images and update content
    let processedCount = 0;
    const {status, items: processedContent} = await processImages(content);
    processedCount ++
    if (status === 'failure') {
      failedCount++;
    } 
    if (failedCount > 3) {
      console.log(`Failed to process ${failedCount} images, stopping`);
      break;
    }
    
    const result = {
      title: detail.title,
      content: processedContent,
      url: detail.url,
      city: extractCityFromTitle(detail.title)
    };
    
    console.log(`${processedCount}/${totalImages} Completed processing article: ${detail.title}`);
    
    // You might want to save the processed result to a database or file here
    console.log(result);
  }
}

const clearLocalImages = async () => {
  const localImages = await fs.readdir('./image');
  for (const image of localImages) {
    await fs.unlink(`./image/${image}`);
  }
}

// clearLocalImages();
process();

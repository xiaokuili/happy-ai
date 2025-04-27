import { JSDOM } from 'jsdom';

import { getDetailsByCreatedAt } from './db/index';
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

function url2filename(url: string): string {
  // Use base64 encoding for reversible string conversion
  const buffer = Buffer.from(url);
  const base64 = buffer.toString('base64');
  // Take first 32 chars of base64 string to keep filename length reasonable
  const truncated = base64.slice(0, 32);
  return `./image/${truncated}.jpg`;
}

function filename2url(filename: string): string {
  // Extract the base64 portion from filename
  const base64 = filename.replace('./image/', '').replace('.jpg', '');
  // Pad the base64 string if needed
  const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  // Convert back to original string
  const buffer = Buffer.from(paddedBase64, 'base64');
  return buffer.toString();
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
    await fs.unlink(localFilePath);
    
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

async function processImages(contentItems: ContentItem[]): Promise<ContentItem[]> {
  const totalImages = contentItems.filter(item => item.type === 'image').length;
  const progress = createProgressTracker(totalImages);
  const processedItems: ContentItem[] = [];

  for (const item of contentItems) {
    if (item.type === 'image') {
      const result = await processOneImage(item);
      if (result.success && result.newSrc) {
        processedItems.push({
          ...item,
          src: result.newSrc
        });
        progress.increment();
        progress.logSuccess(item.src!, result.newSrc);
      } else {
        processedItems.push(item);
        progress.logFailure(item.src!);
      }
    } else {
      processedItems.push(item);
    }
  }

  return processedItems;
}

const process = async () => {
  const details = await getDetailsByCreatedAt('2025-04-23', 10, 0);
  for (const detail of details.slice(0, 1)) {
    console.log("Extracting content...");
    debugger;
    const content = extractContent(detail.content);
    
    // 1. Process and track image downloads
    const imageItems = content.filter(item => item.type === 'image');
    const totalImages = imageItems.length;
    console.log(`Found ${totalImages} images to process`);
    
    // 2. Process images and update content
    let processedCount = 0;
    const processedContent = await processImages(content);
    
    const result = {
      title: detail.title,
      content: processedContent,
      url: detail.url,
    };
    
    console.log(`Completed processing article: ${detail.title}`);
    console.log(`Total images processed: ${processedCount}/${totalImages}`);
    
    // You might want to save the processed result to a database or file here
    console.log(result);
  }
}

process();

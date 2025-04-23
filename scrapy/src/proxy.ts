import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { HttpsProxyAgent } from 'https-proxy-agent';

const PROXY_API_URL = 'https://dps.kdlapi.com/api/getdps/';
const PROXY_USERNAME = 'd2181723860';
const PROXY_PASSWORD = 'eaki118f';
let proxyUrl: string = '';

// 代理配置文件路径
const PROXY_FILE_PATH = path.join(__dirname, '../data/proxy.json');

interface ProxyConfig {
  secret_id: string;
  signature: string;
  num: number;
  pt: number;
  format: string;
  sep: number;
}

const defaultConfig: ProxyConfig = {
  secret_id: 'o77hgvycqhvsk8h33ior',
  signature: 'g73h9bk5ys7n7ylqsqec2eqmwo2yrx40', 
  num: 1,
  pt: 1,
  format: 'text',
  sep: 1
};

/**
 * Get proxy IP from KDL API
 * @returns Promise<string> Proxy IP in format 'ip:port'
 */
const getProxyIp = async (): Promise<string> => {
  try {
    const params = new URLSearchParams(defaultConfig as any);
    const response = await axios.get(`${PROXY_API_URL}?${params}`);
    const proxy = response.data as string;
    return proxy.trim();
  } catch (error) {
    console.error('Failed to get proxy IP:', error);
    throw error;
  }
};

/**
 * Check if a proxy is working by making a test request
 * @param proxy The proxy to check in format 'ip:port'
 * @returns Promise<boolean> Whether the proxy is working
 */
const checkProxyIp = async (proxy: string): Promise<boolean> => {
  try {
    const testUrl = 'http://www.baidu.com';
    const agent = new HttpsProxyAgent(`http://${PROXY_USERNAME}:${PROXY_PASSWORD}@${proxy}`);
    const response = await axios.get(testUrl, {
      // @ts-ignore
      httpsAgent: agent,
      timeout: 5000
    });
    return response.status === 200;
  } catch (error) {
    console.error('Proxy check failed:', error);
    return false;
  }
};

/**
 * Save proxy to file
 * @param proxy The proxy to save
 */
const saveProxyToFile = (proxy: string): void => {
  try {
    // 确保目录存在
    const dir = path.dirname(PROXY_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(PROXY_FILE_PATH, JSON.stringify({ proxy, timestamp: Date.now() }));
    proxyUrl = proxy;
    console.log('✅ Proxy saved to file:', proxy);
  } catch (error) {
    console.error('Failed to save proxy:', error);
    throw error;
  }
};

/**
 * Read proxy from file
 * @returns The saved proxy or null if not found
 */
const readProxyFromFile = (): string | null => {
  try {
    if (!fs.existsSync(PROXY_FILE_PATH)) {
      return null;
    }
    
    const data = JSON.parse(fs.readFileSync(PROXY_FILE_PATH, 'utf8'));
    // 如果代理保存时间超过1小时，认为过期
    if (Date.now() - data.timestamp > 3600000) {
      return null;
    }
    return data.proxy;
  } catch (error) {
    console.error('Failed to read proxy:', error);
    return null;
  }
};

/**
 * Get the current proxy IP, checking and persisting if necessary
 * @returns Promise<string> The current working proxy IP
 */
const getCurrentProxy = async (): Promise<string> => {
  try {
    // 尝试从文件读取现有代理
    const existingProxy = readProxyFromFile();
    if (existingProxy) {
      // 检查现有代理是否仍然有效
      if (await checkProxyIp(existingProxy)) {
        proxyUrl = existingProxy;
        return existingProxy;
      }
    }

    // 如果没有有效的代理，获取新的
    const newProxy = await getProxyIp();
    if (await checkProxyIp(newProxy)) {
      saveProxyToFile(newProxy);
      return newProxy;
    }

    throw new Error('Failed to get a working proxy');
  } catch (error) {
    console.error('Failed to get current proxy:', error);
    throw error;
  }
};

// Initialize proxy on module load
// getCurrentProxy().catch(console.error);

export { proxyUrl, getProxyIp, getCurrentProxy };
import axios from 'axios';

const PROXY_API_URL = 'https://dps.kdlapi.com/api/getdps/';
const PROXY_USERNAME = 'd2181723860';
const PROXY_PASSWORD = 'eaki118f';


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
export const getProxyIp = async (): Promise<string> => {
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

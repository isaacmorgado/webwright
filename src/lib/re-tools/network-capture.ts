/**
 * Network Capture Tool - Alternative to mitmproxy
 *
 * Uses Chrome DevTools Protocol (CDP) to capture network traffic
 * directly from the browser. No proxy setup required.
 *
 * This bypasses the mitmproxy Python 3.14 compatibility issue.
 */

import * as net from 'net';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

const SOCKET_PATH = path.join(os.tmpdir(), 'agentbrowser-pro-default.sock');

interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  postData?: string;
  timestamp: number;
  type: string;
}

interface NetworkResponse {
  requestId: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  mimeType: string;
  body?: string;
}

interface CapturedTraffic {
  requests: NetworkRequest[];
  responses: Map<string, NetworkResponse>;
}

interface DaemonResponse {
  id: string;
  success: boolean;
  result?: any;
  error?: string;
}

async function sendCommand(command: object): Promise<DaemonResponse> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ path: SOCKET_PATH });
    let buffer = '';

    socket.on('connect', () => {
      socket.write(JSON.stringify(command) + '\n');
    });

    socket.on('data', (data) => {
      buffer += data.toString();
      if (buffer.includes('\n')) {
        const line = buffer.split('\n')[0];
        try {
          const response = JSON.parse(line) as DaemonResponse;
          socket.end();
          resolve(response);
        } catch (err) {
          socket.end();
          reject(new Error(`Invalid response: ${line}`));
        }
      }
    });

    socket.on('error', reject);
    socket.setTimeout(60000);
  });
}

/**
 * Capture network traffic using CDP
 * This runs JavaScript in the browser to intercept fetch/XHR
 */
export async function captureNetworkTraffic(
  url: string,
  duration: number = 10000,
  onProgress?: (msg: string) => void
): Promise<CapturedTraffic> {
  const traffic: CapturedTraffic = {
    requests: [],
    responses: new Map(),
  };

  onProgress?.('Starting network capture...');

  // Navigate to the URL
  await sendCommand({ id: 'nav', action: 'navigate', url });
  onProgress?.(`Navigated to ${url}`);

  // Inject network interceptor
  const interceptorScript = `
    window.__capturedRequests = window.__capturedRequests || [];
    window.__capturedResponses = window.__capturedResponses || [];

    // Intercept fetch
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      const [url, options = {}] = args;
      const requestId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);

      window.__capturedRequests.push({
        id: requestId,
        url: typeof url === 'string' ? url : url.url,
        method: options.method || 'GET',
        headers: options.headers || {},
        body: options.body,
        timestamp: Date.now(),
        type: 'fetch'
      });

      try {
        const response = await originalFetch.apply(this, args);
        const clonedResponse = response.clone();

        // Try to get response body
        let body = null;
        try {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('json') || contentType.includes('text')) {
            body = await clonedResponse.text();
          }
        } catch {}

        window.__capturedResponses.push({
          requestId,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          mimeType: response.headers.get('content-type') || '',
          body
        });

        return response;
      } catch (error) {
        throw error;
      }
    };

    // Intercept XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      this.__captureData = { method, url, requestId: Date.now() + '-' + Math.random().toString(36).substr(2, 9) };
      return originalXHROpen.apply(this, [method, url, ...rest]);
    };

    XMLHttpRequest.prototype.send = function(body) {
      if (this.__captureData) {
        window.__capturedRequests.push({
          id: this.__captureData.requestId,
          url: this.__captureData.url,
          method: this.__captureData.method,
          headers: {},
          body: body,
          timestamp: Date.now(),
          type: 'xhr'
        });

        this.addEventListener('load', () => {
          window.__capturedResponses.push({
            requestId: this.__captureData.requestId,
            status: this.status,
            statusText: this.statusText,
            headers: {},
            mimeType: this.getResponseHeader('content-type') || '',
            body: this.responseText
          });
        });
      }
      return originalXHRSend.apply(this, [body]);
    };

    'Network capture initialized';
  `;

  await sendCommand({ id: 'inject', action: 'evaluate', script: interceptorScript });
  onProgress?.('Network interceptor injected');

  // Wait for traffic
  onProgress?.(`Capturing traffic for ${duration / 1000}s...`);
  await new Promise((r) => setTimeout(r, duration));

  // Collect captured data
  const collectScript = `
    JSON.stringify({
      requests: window.__capturedRequests || [],
      responses: window.__capturedResponses || []
    });
  `;

  const result = await sendCommand({ id: 'collect', action: 'evaluate', script: collectScript });

  if (result.success && result.result) {
    try {
      const data = JSON.parse(result.result);
      traffic.requests = data.requests || [];
      data.responses?.forEach((r: any) => {
        traffic.responses.set(r.requestId, r);
      });
      onProgress?.(`Captured ${traffic.requests.length} requests`);
    } catch {}
  }

  return traffic;
}

/**
 * Export captured traffic to HAR format
 */
export function exportToHAR(traffic: CapturedTraffic, url: string): object {
  const har = {
    log: {
      version: '1.2',
      creator: {
        name: 'WebWright Network Capture',
        version: '1.0',
      },
      browser: {
        name: 'Chrome',
        version: 'latest',
      },
      pages: [
        {
          startedDateTime: new Date().toISOString(),
          id: 'page_1',
          title: url,
          pageTimings: {},
        },
      ],
      entries: traffic.requests.map((req) => {
        const resp = traffic.responses.get(req.id);
        return {
          startedDateTime: new Date(req.timestamp).toISOString(),
          time: 0,
          request: {
            method: req.method,
            url: req.url,
            httpVersion: 'HTTP/1.1',
            headers: Object.entries(req.headers || {}).map(([name, value]) => ({
              name,
              value,
            })),
            queryString: [],
            cookies: [],
            headersSize: -1,
            bodySize: req.postData?.length || 0,
            postData: req.postData
              ? {
                  mimeType: 'application/json',
                  text: req.postData,
                }
              : undefined,
          },
          response: resp
            ? {
                status: resp.status,
                statusText: resp.statusText,
                httpVersion: 'HTTP/1.1',
                headers: Object.entries(resp.headers || {}).map(([name, value]) => ({
                  name,
                  value,
                })),
                cookies: [],
                content: {
                  size: resp.body?.length || 0,
                  mimeType: resp.mimeType,
                  text: resp.body,
                },
                redirectURL: '',
                headersSize: -1,
                bodySize: resp.body?.length || 0,
              }
            : {
                status: 0,
                statusText: 'No response captured',
                httpVersion: 'HTTP/1.1',
                headers: [],
                cookies: [],
                content: { size: 0, mimeType: '' },
                redirectURL: '',
                headersSize: -1,
                bodySize: 0,
              },
          cache: {},
          timings: {
            send: 0,
            wait: 0,
            receive: 0,
          },
        };
      }),
    },
  };

  return har;
}

/**
 * Save HAR file to disk
 */
export function saveHAR(traffic: CapturedTraffic, url: string, outputPath: string): void {
  const har = exportToHAR(traffic, url);
  fs.writeFileSync(outputPath, JSON.stringify(har, null, 2));
}

/**
 * Extract API endpoints from captured traffic
 */
export function extractAPIEndpoints(traffic: CapturedTraffic): {
  endpoints: Array<{
    url: string;
    method: string;
    hasAuth: boolean;
    contentType: string;
  }>;
  baseUrls: string[];
} {
  const endpoints: Array<{
    url: string;
    method: string;
    hasAuth: boolean;
    contentType: string;
  }> = [];

  const baseUrls = new Set<string>();

  for (const req of traffic.requests) {
    try {
      const urlObj = new URL(req.url);
      baseUrls.add(urlObj.origin);

      // Filter out static assets
      if (
        !req.url.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|ico)(\?.*)?$/i)
      ) {
        const resp = traffic.responses.get(req.id);
        endpoints.push({
          url: req.url,
          method: req.method,
          hasAuth:
            !!req.headers?.['authorization'] ||
            !!req.headers?.['Authorization'] ||
            req.url.includes('token'),
          contentType: resp?.mimeType || 'unknown',
        });
      }
    } catch {}
  }

  return {
    endpoints,
    baseUrls: Array.from(baseUrls),
  };
}

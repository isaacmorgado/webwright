/**
 * Capture browser-use.com API endpoints using WebWright
 * This captures network traffic and analyzes API structure
 */

import * as net from 'net';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

const SOCKET_PATH = path.join(os.tmpdir(), 'agentbrowser-pro-default.sock');
const OUTPUT_DIR = '/tmp/browser-use-re';

interface Response {
  id: string;
  success: boolean;
  result?: any;
  error?: string;
}

async function sendCommand(command: object): Promise<Response> {
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
          const response = JSON.parse(line) as Response;
          socket.end();
          resolve(response);
        } catch (err) {
          socket.end();
          reject(new Error(`Invalid response: ${line}`));
        }
      }
    });

    socket.on('error', (err) => {
      reject(err);
    });

    socket.setTimeout(60000);
  });
}

async function captureAPIEndpoints() {
  console.log('🔍 Capturing browser-use.com API Endpoints\n');

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  try {
    // Step 1: Navigate through pages and capture snapshots
    const pages = [
      { url: 'https://cloud.browser-use.com', name: 'landing' },
      { url: 'https://cloud.browser-use.com/signup', name: 'signup' },
      { url: 'https://cloud.browser-use.com/login', name: 'login' },
    ];

    const apiEndpoints: string[] = [];
    const pageSnapshots: { [key: string]: string } = {};

    for (const page of pages) {
      console.log(`\n📄 Analyzing: ${page.url}`);

      // Navigate
      const navResult = await sendCommand({
        id: `nav-${page.name}`,
        action: 'navigate',
        url: page.url
      });

      if (!navResult.success) {
        console.log(`   ❌ Navigation failed: ${navResult.error}`);
        continue;
      }

      // Wait for page load
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Take screenshot
      const screenshotResult = await sendCommand({
        id: `screenshot-${page.name}`,
        action: 'screenshot',
        options: { fullPage: true }
      });

      if (screenshotResult.success) {
        console.log(`   📷 Screenshot saved`);
      }

      // Get page snapshot
      const snapshotResult = await sendCommand({
        id: `snapshot-${page.name}`,
        action: 'snapshot'
      });

      if (snapshotResult.success && snapshotResult.result?.markdown) {
        pageSnapshots[page.name] = snapshotResult.result.markdown;
        console.log(`   📋 Snapshot captured (${snapshotResult.result.markdown.length} chars)`);
      }

      // Execute JavaScript to extract API calls from page
      const jsResult = await sendCommand({
        id: `js-${page.name}`,
        action: 'evaluate',
        script: `
          // Extract any API endpoints from the page
          const scripts = Array.from(document.querySelectorAll('script'));
          const endpoints = [];

          scripts.forEach(script => {
            const text = script.textContent || '';
            // Look for API patterns
            const apiPatterns = text.match(/["'](\\/api\\/[^"']+)["']/g) || [];
            const fetchPatterns = text.match(/fetch\\(["']([^"']+)["']/g) || [];
            const axiosPatterns = text.match(/axios\\.[a-z]+\\(["']([^"']+)["']/g) || [];

            endpoints.push(...apiPatterns, ...fetchPatterns, ...axiosPatterns);
          });

          // Also check for inline API calls
          const pageText = document.body.innerHTML;
          const inlineApis = pageText.match(/https?:\\/\\/[^"'\\s]+api[^"'\\s]*/gi) || [];

          return {
            foundEndpoints: endpoints,
            inlineApis: inlineApis.slice(0, 20),
            links: Array.from(document.querySelectorAll('a[href]')).map(a => a.href).filter(h => h.includes('browser-use'))
          };
        `
      });

      if (jsResult.success && jsResult.result) {
        const { foundEndpoints, inlineApis, links } = jsResult.result;
        if (foundEndpoints?.length > 0) {
          apiEndpoints.push(...foundEndpoints);
          console.log(`   🔗 Found ${foundEndpoints.length} API patterns`);
        }
        if (inlineApis?.length > 0) {
          console.log(`   🔗 Found ${inlineApis.length} inline API references`);
        }
        if (links?.length > 0) {
          console.log(`   🔗 Found ${links.length} internal links`);
        }
      }
    }

    // Step 2: Get current page info
    console.log('\n📊 Collecting final information...');

    const urlResult = await sendCommand({
      id: 'final-url',
      action: 'getUrl'
    });

    // Step 3: Save results
    const results = {
      timestamp: new Date().toISOString(),
      pages: Object.keys(pageSnapshots),
      apiEndpoints: [...new Set(apiEndpoints)],
      pageSnapshots,
      finalUrl: urlResult.result?.url
    };

    const outputPath = path.join(OUTPUT_DIR, 'api-discovery-results.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Results saved to: ${outputPath}`);

    // Step 4: Generate summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 DISCOVERY SUMMARY');
    console.log('='.repeat(60));
    console.log(`\nPages analyzed: ${Object.keys(pageSnapshots).length}`);
    console.log(`API endpoints found: ${results.apiEndpoints.length}`);

    if (results.apiEndpoints.length > 0) {
      console.log('\nDiscovered endpoints:');
      results.apiEndpoints.forEach(ep => console.log(`  • ${ep}`));
    }

    // Save markdown snapshot for each page
    for (const [name, content] of Object.entries(pageSnapshots)) {
      const snapshotPath = path.join(OUTPUT_DIR, `${name}-snapshot.md`);
      fs.writeFileSync(snapshotPath, content);
      console.log(`\nSaved ${name} snapshot to: ${snapshotPath}`);
    }

    console.log('\n✅ API capture completed!');
    console.log('\n📁 Output directory:', OUTPUT_DIR);

  } catch (error: any) {
    console.error('❌ Capture failed:', error.message);
    process.exit(1);
  }
}

captureAPIEndpoints();

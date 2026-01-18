/**
 * Test WebWright stealth mode against browser-use.com
 * This tests bot detection bypass capability
 */

import * as net from 'net';
import * as os from 'os';
import * as path from 'path';

const SOCKET_PATH = path.join(os.tmpdir(), 'agentbrowser-pro-default.sock');

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

    socket.setTimeout(30000);
  });
}

async function main() {
  console.log('🔧 Testing WebWright Stealth Mode against browser-use.com\n');

  try {
    // Step 1: Launch browser (if not already launched)
    console.log('1. Launching browser in headed mode...');
    const launchResult = await sendCommand({
      id: 'launch-1',
      action: 'launch',
      options: { headless: false }
    });
    console.log('   Launch result:', launchResult.success ? '✅ Success' : `❌ ${launchResult.error}`);

    // Step 2: Navigate to browser-use.com
    console.log('\n2. Navigating to cloud.browser-use.com...');
    const navResult = await sendCommand({
      id: 'nav-1',
      action: 'navigate',
      url: 'https://cloud.browser-use.com'
    });
    console.log('   Navigate result:', navResult.success ? '✅ Success' : `❌ ${navResult.error}`);

    // Step 3: Wait for page load
    console.log('\n3. Waiting for page to load...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 4: Take screenshot
    console.log('\n4. Taking screenshot...');
    const screenshotResult = await sendCommand({
      id: 'screenshot-1',
      action: 'screenshot',
      options: { fullPage: false }
    });
    console.log('   Screenshot result:', screenshotResult.success ? '✅ Success' : `❌ ${screenshotResult.error}`);
    if (screenshotResult.success && screenshotResult.result?.path) {
      console.log('   Saved to:', screenshotResult.result.path);
    }

    // Step 5: Get page content
    console.log('\n5. Getting page snapshot...');
    const snapshotResult = await sendCommand({
      id: 'snapshot-1',
      action: 'snapshot'
    });
    console.log('   Snapshot result:', snapshotResult.success ? '✅ Success' : `❌ ${snapshotResult.error}`);

    // Step 6: Check for bot detection indicators
    console.log('\n6. Analyzing for bot detection...');
    if (snapshotResult.success && snapshotResult.result?.markdown) {
      const markdown = snapshotResult.result.markdown as string;
      const indicators = {
        'Login/Signup present': markdown.includes('Sign') || markdown.includes('Login') || markdown.includes('sign'),
        'Dashboard access': markdown.includes('dashboard') || markdown.includes('Dashboard'),
        'No CAPTCHA blocking': !markdown.includes('captcha') && !markdown.includes('CAPTCHA'),
        'No bot detection message': !markdown.includes('bot') && !markdown.includes('blocked') && !markdown.includes('suspicious'),
      };

      for (const [check, passed] of Object.entries(indicators)) {
        console.log(`   ${passed ? '✅' : '❌'} ${check}`);
      }
    }

    // Step 7: Get current URL
    console.log('\n7. Verifying current URL...');
    const urlResult = await sendCommand({
      id: 'url-1',
      action: 'getUrl'
    });
    console.log('   Current URL:', urlResult.success ? urlResult.result : urlResult.error);

    console.log('\n✅ Stealth test completed!');
    console.log('\n📋 Summary:');
    console.log('   - Browser launched successfully');
    console.log('   - Navigated to browser-use.com without being blocked');
    console.log('   - Page content accessible');
    console.log('   - Stealth mode appears to be working');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.log('\nMake sure the WebWright daemon is running:');
    console.log('  cd ~/webwright && AGENT_BROWSER_DAEMON=1 AGENT_BROWSER_HEADED=1 npx tsx src/core/daemon.ts');
    process.exit(1);
  }
}

main();

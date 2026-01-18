/**
 * Test Login Persistence for browser-use.com
 *
 * This script tests if WebWright can maintain login sessions using
 * persistent browser profiles.
 *
 * Usage:
 *   1. First run: Browser opens at signup page
 *   2. Manually log in via GitHub/Google/Email
 *   3. Second run: Should show dashboard (logged in state)
 *
 * Profile location: ~/.webwright-profiles/browser-use/
 */

import * as net from 'net';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

const SOCKET_PATH = path.join(os.tmpdir(), 'agentbrowser-pro-default.sock');
const PROFILE_DIR = path.join(os.homedir(), '.webwright-profiles', 'browser-use');

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

    socket.on('error', reject);
    socket.setTimeout(60000);
  });
}

async function main() {
  const mode = process.argv[2] || 'check';

  console.log('🔐 Browser-Use Login Persistence Test\n');

  // Check if profile exists
  const profileExists = fs.existsSync(PROFILE_DIR);
  console.log(`Profile directory: ${PROFILE_DIR}`);
  console.log(`Profile exists: ${profileExists ? '✅ Yes' : '❌ No'}\n`);

  if (mode === 'reset') {
    console.log('🗑️  Resetting profile...');
    if (profileExists) {
      fs.rmSync(PROFILE_DIR, { recursive: true, force: true });
      console.log('   Profile deleted. Next run will start fresh.\n');
    } else {
      console.log('   No profile to delete.\n');
    }
    return;
  }

  // Close existing browser
  console.log('1. Closing any existing browser...');
  try {
    await sendCommand({ id: 'close', action: 'close' });
    await new Promise(r => setTimeout(r, 1000));
  } catch {
    // Ignore errors if not running
  }

  // Launch with persistent profile
  console.log('\n2. Launching browser with persistent profile...');
  const launchResult = await sendCommand({
    id: 'launch',
    action: 'launch',
    options: {
      headless: false,
      userDataDir: PROFILE_DIR
    }
  });

  if (!launchResult.success) {
    console.error('   ❌ Launch failed:', launchResult.error);
    process.exit(1);
  }
  console.log('   ✅ Browser launched');

  await new Promise(r => setTimeout(r, 3000));

  // Navigate to cloud dashboard
  console.log('\n3. Navigating to cloud.browser-use.com...');
  await sendCommand({
    id: 'nav',
    action: 'navigate',
    url: 'https://cloud.browser-use.com'
  });

  await new Promise(r => setTimeout(r, 4000));

  // Check final URL
  const urlResult = await sendCommand({ id: 'url', action: 'getUrl' });
  const currentUrl = urlResult.result?.url || '';
  console.log(`   Current URL: ${currentUrl}`);

  // Get page snapshot
  const snapResult = await sendCommand({ id: 'snap', action: 'snapshot' });
  const tree = snapResult.result?.tree || '';

  // Analyze login state
  console.log('\n4. Analyzing login state...\n');

  const isSignup = currentUrl.includes('/signup') || tree.includes('Create a new account');
  const isLogin = currentUrl.includes('/login') || (tree.includes('Sign in') && tree.includes('Password'));
  const isDashboard = currentUrl.includes('/dashboard') ||
    tree.includes('Dashboard') ||
    tree.includes('Your agents') ||
    tree.includes('Sessions') ||
    tree.includes('API Keys');

  if (isDashboard) {
    console.log('   🎉 SUCCESS - You are LOGGED IN!');
    console.log('   ✅ Dashboard is accessible');
    console.log('   ✅ Session persisted correctly');
    console.log('\n   Protected pages you can now access:');
    console.log('   • /dashboard - Main dashboard');
    console.log('   • /sessions - Session history');
    console.log('   • /agents - Your agents');
    console.log('   • /api-keys - API key management');
    console.log('   • /settings - Account settings');

    // Try to access dashboard directly
    console.log('\n5. Testing dashboard access...');
    await sendCommand({
      id: 'nav-dash',
      action: 'navigate',
      url: 'https://cloud.browser-use.com/dashboard'
    });
    await new Promise(r => setTimeout(r, 2000));

    const dashUrl = await sendCommand({ id: 'dash-url', action: 'getUrl' });
    const dashSnap = await sendCommand({ id: 'dash-snap', action: 'snapshot' });

    console.log(`   Dashboard URL: ${dashUrl.result?.url}`);
    console.log('   Dashboard content preview:');
    console.log('   ' + (dashSnap.result?.tree || '').substring(0, 800).replace(/\n/g, '\n   '));

  } else if (isSignup || isLogin) {
    console.log('   ❌ NOT LOGGED IN - Redirected to auth page');
    console.log('\n   📋 To persist your login:');
    console.log('   1. A browser window should be open now');
    console.log('   2. Click "Sign up with GitHub" or "Sign up with Google"');
    console.log('   3. Complete the OAuth flow');
    console.log('   4. Once you see the dashboard, the session is saved');
    console.log('   5. Run this script again to verify persistence');
    console.log('\n   The browser will stay open for you to log in.');
  } else {
    console.log('   ⚠️  Unknown state - checking page content...');
    console.log('\n   Page tree:');
    console.log('   ' + tree.substring(0, 1000).replace(/\n/g, '\n   '));
  }

  console.log('\n' + '─'.repeat(60));
  console.log('Commands:');
  console.log('  npx tsx test-login-persistence.ts        # Check login state');
  console.log('  npx tsx test-login-persistence.ts reset  # Clear saved profile');
  console.log('─'.repeat(60));
}

main().catch(console.error);

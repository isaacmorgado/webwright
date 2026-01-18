/**
 * Test Natural Language RE Prompts
 *
 * Usage: npx tsx test-natural-language-re.ts "your prompt here"
 *
 * Examples:
 *   npx tsx test-natural-language-re.ts "reverse engineer https://browser-use.com and extract UI elements"
 *   npx tsx test-natural-language-re.ts "capture all API calls from example.com"
 *   npx tsx test-natural-language-re.ts "clone the UI from https://stripe.com"
 */

import { analyzeTask } from './src/lib/task-analyzer';
import { executeRETask, isDaemonRunning } from './src/lib/re-orchestrator';

async function main() {
  const prompt = process.argv.slice(2).join(' ') || 'reverse engineer this website and extract the UI elements from https://browser-use.com';

  console.log('═'.repeat(60));
  console.log('🔍 Natural Language RE Test');
  console.log('═'.repeat(60));
  console.log(`\nPrompt: "${prompt}"\n`);

  // Step 1: Analyze the task (no daemon needed)
  console.log('📊 Task Analysis:');
  console.log('─'.repeat(40));
  const task = analyzeTask(prompt);

  console.log(`  Type: ${task.type}`);
  console.log(`  Confidence: ${(task.confidence * 100).toFixed(0)}%`);
  console.log(`  Target URL: ${task.targetUrl || '(none detected)'}`);
  console.log(`  Tools: ${task.tools.join(', ')}`);
  console.log(`  Description: ${task.description}`);

  console.log('\n📋 Workflow Steps:');
  console.log('─'.repeat(40));
  task.workflow.forEach((step, i) => {
    const deps = step.dependsOn ? ` (after: ${step.dependsOn.join(', ')})` : '';
    console.log(`  ${i + 1}. [${step.tool}] ${step.name}${deps}`);
  });

  // Step 2: Check if daemon is running
  console.log('\n🔌 Daemon Status:');
  console.log('─'.repeat(40));
  const daemonRunning = await isDaemonRunning();

  if (!daemonRunning) {
    console.log('  ❌ WebWright daemon is NOT running');
    console.log('\n  To start the daemon:');
    console.log('  cd ~/webwright && AGENT_BROWSER_DAEMON=1 AGENT_BROWSER_HEADED=1 npx tsx src/core/daemon.ts');
    console.log('\n  Then run this test again to execute the workflow.');
    return;
  }

  console.log('  ✅ WebWright daemon is running');

  // Step 3: Execute the task
  console.log('\n🚀 Executing Task:');
  console.log('─'.repeat(40));

  const result = await executeRETask(prompt, (msg) => {
    console.log(`  ${msg}`);
  });

  // Step 4: Show results
  console.log('\n📊 Results:');
  console.log('─'.repeat(40));
  console.log(`  Success: ${result.success ? '✅' : '❌'}`);
  console.log(`  Summary: ${result.summary}`);

  if (result.artifacts.length > 0) {
    console.log('\n📦 Artifacts:');
    result.artifacts.forEach((artifact) => {
      if (artifact.path) {
        console.log(`  - ${artifact.type}: ${artifact.path}`);
      } else if (artifact.data) {
        const preview = typeof artifact.data === 'string'
          ? artifact.data.substring(0, 200)
          : JSON.stringify(artifact.data).substring(0, 200);
        console.log(`  - ${artifact.type}: ${preview}...`);
      }
    });
  }

  console.log('\n' + '═'.repeat(60));
}

main().catch(console.error);

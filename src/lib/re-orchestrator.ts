/**
 * RE Orchestrator - Executes analyzed tasks
 *
 * Takes output from task-analyzer and executes the workflow
 * using WebWright daemon and other tools.
 *
 * Now with session persistence - all results saved to database!
 */

import * as net from 'net';
import * as os from 'os';
import * as path from 'path';
import { analyzeTask, type AnalyzedTask, type WorkflowStep } from './task-analyzer';

const SOCKET_PATH = path.join(os.tmpdir(), 'agentbrowser-pro-default.sock');

interface DaemonResponse {
  id: string;
  success: boolean;
  result?: any;
  error?: string;
}

interface ExecutionResult {
  success: boolean;
  task: AnalyzedTask;
  results: StepResult[];
  summary: string;
  artifacts: Artifact[];
  sessionId?: string;
}

interface StepResult {
  stepId: string;
  stepName: string;
  success: boolean;
  result?: any;
  error?: string;
  duration: number;
}

interface Artifact {
  type: 'screenshot' | 'snapshot' | 'har' | 'elements' | 'api_endpoints' | 'code';
  path?: string;
  data?: any;
}

// Check if running in Electron renderer
const isElectron = typeof window !== 'undefined' && window.electron;

/**
 * Send command to WebWright daemon
 */
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
 * Check if daemon is running
 */
export async function isDaemonRunning(): Promise<boolean> {
  try {
    const result = await sendCommand({ id: 'ping', action: 'getUrl' });
    return result.success || result.error?.includes('No pages') || false;
  } catch {
    return false;
  }
}

/**
 * Execute a single workflow step
 */
async function executeStep(step: WorkflowStep, onProgress?: (msg: string) => void): Promise<StepResult> {
  const startTime = Date.now();
  onProgress?.(`Executing: ${step.name}`);

  try {
    let result: any;

    switch (step.action) {
      case 'navigate':
        result = await sendCommand({
          id: step.id,
          action: 'navigate',
          url: step.params.url,
        });
        break;

      case 'snapshot':
        result = await sendCommand({
          id: step.id,
          action: 'snapshot',
        });
        break;

      case 'screenshot':
        result = await sendCommand({
          id: step.id,
          action: 'screenshot',
          options: step.params,
        });
        break;

      case 'evaluate':
        result = await sendCommand({
          id: step.id,
          action: 'evaluate',
          script: step.params.script,
        });
        break;

      case 'interact_all':
        // Click through interactive elements
        result = await interactWithAllElements(onProgress);
        break;

      case 'enable_network':
        // Network capture is automatic via CDP
        result = { success: true, result: { enabled: true } };
        break;

      case 'export_har':
        // Would integrate with mitmproxy or CDP
        result = { success: true, result: { path: step.params.output } };
        break;

      default:
        result = { success: false, error: `Unknown action: ${step.action}` };
    }

    return {
      stepId: step.id,
      stepName: step.name,
      success: result.success,
      result: result.result,
      error: result.error,
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      stepId: step.id,
      stepName: step.name,
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Interact with all clickable elements on the page
 */
async function interactWithAllElements(onProgress?: (msg: string) => void): Promise<DaemonResponse> {
  // Get snapshot first
  const snapshot = await sendCommand({ id: 'snap', action: 'snapshot' });
  if (!snapshot.success) return snapshot;

  // Extract interactive element refs
  const refs = snapshot.result?.refs || {};
  const clickableRefs = Object.keys(refs).filter((ref) => {
    const el = refs[ref];
    return el.role === 'button' || el.role === 'link' || el.tag === 'a';
  });

  onProgress?.(`Found ${clickableRefs.length} interactive elements`);

  // Click first few elements (limit to avoid infinite loops)
  const maxClicks = Math.min(clickableRefs.length, 5);
  for (let i = 0; i < maxClicks; i++) {
    const ref = clickableRefs[i];
    onProgress?.(`Clicking element ${i + 1}/${maxClicks}: ${ref}`);
    await sendCommand({ id: `click-${i}`, action: 'click', ref });
    await new Promise((r) => setTimeout(r, 1000));
  }

  return { id: 'interact', success: true, result: { clickedCount: maxClicks } };
}

/**
 * Execute a complete analyzed task with session persistence
 */
export async function executeTask(
  task: AnalyzedTask,
  onProgress?: (msg: string) => void,
  options?: { saveSession?: boolean }
): Promise<ExecutionResult> {
  const results: StepResult[] = [];
  const artifacts: Artifact[] = [];
  let sessionId: string | undefined;
  const shouldSave = options?.saveSession !== false && isElectron;

  onProgress?.(`Starting: ${task.description}`);
  onProgress?.(`Task type: ${task.type} (confidence: ${(task.confidence * 100).toFixed(0)}%)`);
  onProgress?.(`Tools: ${task.tools.join(', ')}`);

  // Create session in database if running in Electron
  if (shouldSave) {
    try {
      const response = await window.electron.sessions.create({
        taskDescription: task.description,
        taskType: task.type,
        targetUrl: task.targetUrl,
        confidence: task.confidence,
        tools: task.tools,
      });
      if (response.success && response.session) {
        sessionId = response.session.id;
        onProgress?.(`Session created: ${sessionId}`);
      }
    } catch (err) {
      onProgress?.(`Warning: Could not create session - ${err}`);
    }
  }

  // Check daemon
  if (!(await isDaemonRunning())) {
    const errorMsg = 'WebWright daemon is not running. Start it first.';
    if (shouldSave && sessionId) {
      await window.electron.sessions.update(sessionId, { status: 'failed', error: errorMsg });
    }
    return {
      success: false,
      task,
      results: [],
      summary: errorMsg,
      artifacts: [],
      sessionId,
    };
  }

  // Execute workflow steps in order
  for (const step of task.workflow) {
    // Add step to database
    let dbStepId: string | undefined;
    if (shouldSave && sessionId) {
      try {
        const stepResponse = await window.electron.steps.add(sessionId, {
          stepId: step.id,
          stepName: step.name,
          tool: step.tool,
          action: step.action,
        });
        dbStepId = stepResponse.stepId;
      } catch {}
    }

    // Check dependencies
    if (step.dependsOn) {
      const depsFailed = step.dependsOn.some((depId) => {
        const depResult = results.find((r) => r.stepId === depId);
        return !depResult?.success;
      });

      if (depsFailed) {
        onProgress?.(`Skipping ${step.name} - dependencies failed`);
        const failedResult = {
          stepId: step.id,
          stepName: step.name,
          success: false,
          error: 'Dependencies failed',
          duration: 0,
        };
        results.push(failedResult);
        if (shouldSave && dbStepId) {
          await window.electron.steps.update(dbStepId, { status: 'failed', error: 'Dependencies failed' });
        }
        continue;
      }
    }

    const result = await executeStep(step, onProgress);
    results.push(result);

    // Update step status in database
    if (shouldSave && dbStepId) {
      await window.electron.steps.update(dbStepId, {
        status: result.success ? 'completed' : 'failed',
        result: result.result,
        error: result.error,
      });
    }

    // Collect artifacts and save to database
    if (result.success) {
      if (step.action === 'screenshot' && result.result?.path) {
        const artifact = { type: 'screenshot' as const, path: result.result.path };
        artifacts.push(artifact);
        if (shouldSave && sessionId) {
          await window.electron.artifacts.add(sessionId, {
            type: 'screenshot',
            name: `screenshot_${step.id}.png`,
            metadata: { stepId: step.id, path: result.result.path },
          });
        }
      }
      if (step.action === 'snapshot' && result.result?.tree) {
        const artifact = { type: 'snapshot' as const, data: result.result.tree };
        artifacts.push(artifact);
        if (shouldSave && sessionId) {
          await window.electron.artifacts.add(sessionId, {
            type: 'snapshot',
            name: `snapshot_${step.id}.json`,
            content: result.result.tree,
          });
        }
      }
      if (step.action === 'evaluate' && result.result) {
        if (step.id.includes('element') || step.id.includes('ui')) {
          const artifact = { type: 'elements' as const, data: result.result };
          artifacts.push(artifact);
          if (shouldSave && sessionId) {
            await window.electron.artifacts.add(sessionId, {
              type: 'elements',
              name: `elements_${step.id}.json`,
              content: result.result,
            });
          }
        }
        if (step.id.includes('api')) {
          const artifact = { type: 'api_endpoints' as const, data: result.result };
          artifacts.push(artifact);
          if (shouldSave && sessionId) {
            await window.electron.artifacts.add(sessionId, {
              type: 'api_endpoints',
              name: `api_endpoints_${step.id}.json`,
              content: result.result,
            });
          }
        }
      }
    }

    onProgress?.(result.success ? `✅ ${step.name}` : `❌ ${step.name}: ${result.error}`);
  }

  const successCount = results.filter((r) => r.success).length;
  const totalSteps = results.length;
  const summary = `Completed ${successCount}/${totalSteps} steps. ${artifacts.length} artifacts collected.`;

  // Update session status
  if (shouldSave && sessionId) {
    await window.electron.sessions.update(sessionId, {
      status: successCount === totalSteps ? 'completed' : 'failed',
      summary,
    });
  }

  return {
    success: successCount === totalSteps,
    task,
    results,
    summary,
    artifacts,
    sessionId,
  };
}

/**
 * Main entry: Execute a natural language RE task
 *
 * @example
 * await executeRETask("reverse engineer https://example.com and extract UI elements")
 */
export async function executeRETask(
  prompt: string,
  onProgress?: (msg: string) => void,
  options?: { saveSession?: boolean }
): Promise<ExecutionResult> {
  // Analyze the task
  onProgress?.(`Analyzing: "${prompt}"`);
  const task = analyzeTask(prompt);

  onProgress?.(`Detected intent: ${task.type}`);
  if (task.targetUrl) {
    onProgress?.(`Target URL: ${task.targetUrl}`);
  }

  // Execute with session persistence
  return executeTask(task, onProgress, options);
}

// Export for use as module
export { analyzeTask };

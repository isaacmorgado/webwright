/**
 * mitmproxy Runner
 *
 * Integrates mitmproxy for HTTP/HTTPS traffic interception
 * Supports starting proxy, capturing traffic, and exporting HAR files
 */

import { exec } from 'child_process'
import { promisify } from 'util'
// Note: fs and path imports removed - using network-capture.ts instead for CDP-based capture

const execAsync = promisify(exec)

export interface MitmproxyConfig {
  port?: number
  mode?: 'proxy' | 'transparent' | 'reverse'
  outputFile?: string
  filters?: string[]
}

export interface MitmproxyResult {
  success: boolean
  harFile?: string
  requests?: NetworkRequest[]
  error?: string
}

export interface NetworkRequest {
  url: string
  method: string
  status?: number
  requestHeaders: Record<string, string>
  responseHeaders?: Record<string, string>
  requestBody?: string
  responseBody?: string
  timestamp: number
}

export class MitmproxyRunner {
  private proxyProcess: any = null
  private config: MitmproxyConfig

  constructor(config: MitmproxyConfig = {}) {
    this.config = {
      port: config.port || 8080,
      mode: config.mode || 'proxy',
      outputFile: config.outputFile || '/tmp/mitmproxy-capture.mitm',
      filters: config.filters || []
    }
  }

  /**
   * Check if mitmproxy is installed
   */
  async isInstalled(): Promise<boolean> {
    try {
      await execAsync('which mitmproxy')
      return true
    } catch {
      return false
    }
  }

  /**
   * Get mitmproxy version
   */
  async getVersion(): Promise<string | null> {
    try {
      const { stdout } = await execAsync('mitmproxy --version')
      return stdout.trim()
    } catch {
      return null
    }
  }

  /**
   * Start mitmproxy in background
   * Returns true if started successfully
   */
  async start(): Promise<boolean> {
    if (!await this.isInstalled()) {
      throw new Error('mitmproxy is not installed')
    }

    try {
      // Use mitmdump (headless) for programmatic use
      const cmd = [
        'mitmdump',
        `-p ${this.config.port}`,
        `-w ${this.config.outputFile}`,
        '--set block_global=false',
        ...(this.config.filters || []).map(f => `--set filter='${f}'`)
      ].join(' ')

      // Start in background
      const { spawn } = await import('child_process')
      this.proxyProcess = spawn('sh', ['-c', cmd], {
        detached: true,
        stdio: 'ignore'
      })

      this.proxyProcess.unref()

      // Wait 2 seconds for proxy to start
      await new Promise(resolve => setTimeout(resolve, 2000))

      return true
    } catch (error: any) {
      console.error('Failed to start mitmproxy:', error)
      return false
    }
  }

  /**
   * Stop mitmproxy
   */
  async stop(): Promise<void> {
    if (this.proxyProcess) {
      this.proxyProcess.kill()
      this.proxyProcess = null
    }
  }

  /**
   * Export captured traffic to HAR format
   */
  async exportHAR(outputPath: string): Promise<string> {
    const harFile = outputPath || '/tmp/captured-traffic.har'

    const cmd = [
      'mitmdump',
      `-r ${this.config.outputFile}`,
      '--set hardump=' + harFile
    ].join(' ')

    try {
      await execAsync(cmd)
      return harFile
    } catch (error: any) {
      throw new Error(`Failed to export HAR: ${error.message}`)
    }
  }

  /**
   * Parse captured traffic into structured format
   */
  async parseCapture(): Promise<NetworkRequest[]> {
    // This would parse the .mitm file
    // For now, return empty array
    // TODO: Implement proper parsing using mitmproxy's flow format
    return []
  }

  /**
   * Get proxy configuration for browsers
   */
  getProxyConfig(): { host: string; port: number; url: string } {
    return {
      host: 'localhost',
      port: this.config.port!,
      url: `http://localhost:${this.config.port}`
    }
  }

  /**
   * Execute mitmproxy workflow:
   * 1. Start proxy
   * 2. Wait for traffic capture
   * 3. Stop proxy
   * 4. Export HAR
   */
  async executeWorkflow(captureTimeMs: number = 60000): Promise<MitmproxyResult> {
    try {
      // Start proxy
      const started = await this.start()
      if (!started) {
        return {
          success: false,
          error: 'Failed to start mitmproxy'
        }
      }

      console.log(`✓ mitmproxy started on port ${this.config.port}`)
      console.log(`  Configure browser to use proxy: localhost:${this.config.port}`)
      console.log(`  Capturing traffic for ${captureTimeMs / 1000} seconds...`)

      // Wait for capture duration
      await new Promise(resolve => setTimeout(resolve, captureTimeMs))

      // Stop proxy
      await this.stop()
      console.log('✓ mitmproxy stopped')

      // Export HAR
      const timestamp = new Date().toISOString().replace(/:/g, '-')
      const harFile = `/tmp/browser-use-${timestamp}.har`

      try {
        await this.exportHAR(harFile)
        console.log(`✓ HAR exported: ${harFile}`)

        return {
          success: true,
          harFile
        }
      } catch (error: any) {
        return {
          success: true,
          harFile: this.config.outputFile,
          error: `Capture successful but HAR export failed: ${error.message}`
        }
      }
    } catch (error: any) {
      await this.stop()
      return {
        success: false,
        error: error.message
      }
    }
  }
}

// CLI Usage Example
if (require.main === module) {
  (async () => {
    const runner = new MitmproxyRunner({
      port: 8080,
      outputFile: '/tmp/test-capture.mitm'
    })

    console.log('mitmproxy Runner Test\n')

    const installed = await runner.isInstalled()
    console.log(`Installed: ${installed}`)

    if (!installed) {
      console.error('mitmproxy is not installed')
      console.error('Install with: pip install mitmproxy')
      process.exit(1)
    }

    const version = await runner.getVersion()
    console.log(`Version: ${version}\n`)

    console.log('Starting 30-second capture...')
    const result = await runner.executeWorkflow(30000)

    if (result.success) {
      console.log('\n✅ Capture successful!')
      console.log(`HAR file: ${result.harFile}`)
    } else {
      console.error('\n❌ Capture failed:', result.error)
    }
  })()
}

import { useQuery } from '@tanstack/react-query'
import { WebWrightClient } from '../lib/webwright-client'

export default function SettingsPage() {
  const client = new WebWrightClient()

  const { data: daemonStatus, isLoading } = useQuery({
    queryKey: ['daemon-status-detailed'],
    queryFn: () => client.getDaemonStatus(),
    refetchInterval: 5000,
  })

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

      <div className="space-y-8">
        {/* Daemon Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            WebWright Daemon
          </h2>

          {isLoading ? (
            <p className="text-gray-500">Loading...</p>
          ) : daemonStatus ? (
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-600">Status</div>
                <div className="text-lg font-semibold text-green-600">
                  ● Running
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Version</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {daemonStatus.version || 'v1.0.0'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Active Sessions</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {daemonStatus.sessions || 0}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-600">Connection</div>
                <div className="text-sm font-mono text-gray-900">
                  http://localhost:3456
                </div>
              </div>
            </div>
          ) : (
            <div className="text-red-600">
              <div className="font-semibold mb-2">Daemon Offline</div>
              <div className="text-sm text-gray-600">
                Start the WebWright daemon:
              </div>
              <code className="block mt-2 p-2 bg-gray-100 rounded text-sm">
                webwright daemon
              </code>
            </div>
          )}
        </div>

        {/* Connection Settings */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Connection Settings
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Daemon URL
              </label>
              <input
                type="text"
                value="http://localhost:3456"
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500">
                Default WebWright daemon address
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Polling Interval
              </label>
              <input
                type="text"
                value="2 seconds"
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500">
                How often to check for session updates
              </p>
            </div>
          </div>
        </div>

        {/* WebWright Features */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            WebWright Features
          </h2>

          <div className="space-y-3 text-sm">
            <div className="flex items-center">
              <span className="text-green-600 mr-2">✓</span>
              <span>22 MCP Tools for Claude Code</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-600 mr-2">✓</span>
              <span>Playwright-based browser automation</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-600 mr-2">✓</span>
              <span>Ref-based element targeting</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-600 mr-2">✓</span>
              <span>Multi-tab and multi-window support</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-600 mr-2">✓</span>
              <span>Built-in stealth mode</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-600 mr-2">✓</span>
              <span>Local execution (100% free)</span>
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Quick Links
          </h2>

          <div className="space-y-2">
            <a
              href="https://github.com/webwright/webwright"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-primary hover:underline"
            >
              GitHub Repository →
            </a>
            <a
              href="https://docs.webwright.com"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-primary hover:underline"
            >
              Documentation →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

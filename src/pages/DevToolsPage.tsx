import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { WebWrightClient, ConsoleMessage, NetworkRequest } from '../lib/webwright-client'

export default function DevToolsPage() {
  const [activeTab, setActiveTab] = useState<'console' | 'network' | 'har'>('console')
  const [consoleFilter, setConsoleFilter] = useState<string>('all')
  const [harRecording, setHarRecording] = useState(false)

  const client = new WebWrightClient()
  const queryClient = useQueryClient()

  // Console Messages Query
  const { data: consoleMessages = [], isLoading: consoleLoading } = useQuery({
    queryKey: ['console', consoleFilter],
    queryFn: () => client.getConsoleMessages({
      type: consoleFilter === 'all' ? undefined : consoleFilter
    }),
    refetchInterval: 2000,
    enabled: activeTab === 'console',
  })

  // Network Requests Query
  const { data: networkRequests = [], isLoading: networkLoading } = useQuery({
    queryKey: ['network'],
    queryFn: () => client.getNetworkRequests(),
    refetchInterval: 2000,
    enabled: activeTab === 'network',
  })

  // HAR Recording Mutations
  const startHarMutation = useMutation({
    mutationFn: () => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      return client.startHARRecording(`./har-${timestamp}.har`)
    },
    onSuccess: () => {
      setHarRecording(true)
    },
  })

  const stopHarMutation = useMutation({
    mutationFn: () => client.stopHARRecording(),
    onSuccess: (data) => {
      setHarRecording(false)
      alert(`HAR file saved to: ${data.path}`)
    },
  })

  // Clear console
  const clearConsoleMutation = useMutation({
    mutationFn: () => client.getConsoleMessages({ clear: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['console'] })
    },
  })

  const tabs = [
    { id: 'console' as const, label: 'Console', icon: '🖥️' },
    { id: 'network' as const, label: 'Network', icon: '🌐' },
    { id: 'har' as const, label: 'HAR Export', icon: '📦' },
  ]

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <h1 className="text-3xl font-bold text-gray-900">DevTools</h1>
        <p className="text-gray-600 mt-1">Console logs, network traffic, and HAR export</p>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-8">
          <div className="flex gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 border-b-2 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        {activeTab === 'console' && (
          <div>
            {/* Console Filter */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex gap-2">
                {['all', 'log', 'warn', 'error', 'info'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setConsoleFilter(filter)}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      consoleFilter === filter
                        ? 'bg-primary text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
              <button
                onClick={() => clearConsoleMutation.mutate()}
                disabled={clearConsoleMutation.isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50"
              >
                Clear Console
              </button>
            </div>

            {/* Console Messages */}
            {consoleLoading ? (
              <div className="text-gray-500">Loading console messages...</div>
            ) : consoleMessages.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                No console messages yet
              </div>
            ) : (
              <div className="space-y-2">
                {consoleMessages.map((msg: ConsoleMessage, idx: number) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-md font-mono text-sm ${
                      msg.type === 'error'
                        ? 'bg-red-50 border border-red-200 text-red-800'
                        : msg.type === 'warn'
                        ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                        : msg.type === 'info'
                        ? 'bg-blue-50 border border-blue-200 text-blue-800'
                        : 'bg-gray-50 border border-gray-200 text-gray-800'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold uppercase text-xs">
                            {msg.type}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="whitespace-pre-wrap">{msg.text}</div>
                        {msg.location && (
                          <div className="text-xs text-gray-600 mt-1">
                            {msg.location.url}
                            {msg.location.lineNumber && `:${msg.location.lineNumber}`}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'network' && (
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Network Requests</h3>
              <p className="text-sm text-gray-600">All HTTP requests made by the browser</p>
            </div>

            {networkLoading ? (
              <div className="text-gray-500">Loading network requests...</div>
            ) : networkRequests.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                No network requests captured yet
              </div>
            ) : (
              <div className="space-y-2">
                {networkRequests.map((req: NetworkRequest, idx: number) => (
                  <div
                    key={idx}
                    className="bg-white border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            req.method === 'GET'
                              ? 'bg-blue-100 text-blue-800'
                              : req.method === 'POST'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {req.method}
                          </span>
                          {req.status && (
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              req.status >= 200 && req.status < 300
                                ? 'bg-green-100 text-green-800'
                                : req.status >= 400
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {req.status}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {new Date(req.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="font-mono text-sm text-gray-900 break-all">
                          {req.url}
                        </div>
                        {req.responseBody && (
                          <details className="mt-2">
                            <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-900">
                              Response Body
                            </summary>
                            <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                              {req.responseBody}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'har' && (
          <div>
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900">HAR File Export</h3>
              <p className="text-sm text-gray-600">Record all network traffic to HAR format for analysis</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-semibold text-gray-900">Recording Status</div>
                  <div className={`text-sm mt-1 ${harRecording ? 'text-green-600' : 'text-gray-500'}`}>
                    {harRecording ? '● Recording in progress' : 'Not recording'}
                  </div>
                </div>
                {harRecording ? (
                  <button
                    onClick={() => stopHarMutation.mutate()}
                    disabled={stopHarMutation.isPending}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors disabled:opacity-50"
                  >
                    {stopHarMutation.isPending ? 'Stopping...' : 'Stop Recording'}
                  </button>
                ) : (
                  <button
                    onClick={() => startHarMutation.mutate()}
                    disabled={startHarMutation.isPending}
                    className="px-6 py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-md transition-colors disabled:opacity-50"
                  >
                    {startHarMutation.isPending ? 'Starting...' : 'Start Recording'}
                  </button>
                )}
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">What is HAR?</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• HAR (HTTP Archive) is a JSON format for recording HTTP transactions</li>
                  <li>• Contains all requests, responses, headers, and timing information</li>
                  <li>• Can be imported into Chrome DevTools, Postman, or online analyzers</li>
                  <li>• Useful for debugging, performance analysis, and API documentation</li>
                </ul>
              </div>

              <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">How to use HAR files:</h4>
                <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                  <li>Start recording before performing actions in the browser</li>
                  <li>Navigate, click, submit forms - all traffic is captured</li>
                  <li>Stop recording when done</li>
                  <li>Import HAR file into analysis tools:
                    <ul className="ml-6 mt-1 space-y-1">
                      <li>• Chrome DevTools → Network → Import HAR</li>
                      <li>• Postman → Import → HAR format</li>
                      <li>• mitmproxy2swagger for API docs</li>
                    </ul>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

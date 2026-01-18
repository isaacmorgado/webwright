import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { WebWrightClient } from '../lib/webwright-client'
import { analyzeTask, type AnalyzedTask } from '../lib/task-analyzer'

interface TaskTemplate {
  id: string
  name: string
  description: string
  icon: string
  exampleTask: string
  tools: string[]
}

const TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: 'api_discovery',
    name: 'API Discovery',
    description: 'Discover and document API endpoints from a web application',
    icon: '🔍',
    exampleTask: 'Reverse engineer the API from https://cloud.browser-use.com',
    tools: ['mitmproxy', 'kiterunner', 'webwright-stealth']
  },
  {
    id: 'ui_clone',
    name: 'UI Cloning',
    description: 'Clone website UI by converting screenshots to React code',
    icon: '🎨',
    exampleTask: 'Clone the UI design from https://example.com',
    tools: ['webwright-stealth', 'screenshot-to-code', 'chrome-devtools']
  },
  {
    id: 'graphql_schema',
    name: 'GraphQL Schema',
    description: 'Extract GraphQL schema even when introspection is disabled',
    icon: '📊',
    exampleTask: 'Extract GraphQL schema from https://api.example.com/graphql',
    tools: ['clairvoyance', 'inql', 'webwright-stealth']
  },
  {
    id: 'protobuf_extract',
    name: 'Protobuf Extraction',
    description: 'Reverse engineer .proto files from binary data or APKs',
    icon: '📦',
    exampleTask: 'Extract protobuf schemas from app.apk',
    tools: ['pbtk', 'blackbox-protobuf', 'protoc']
  },
  {
    id: 'stealth_scrape',
    name: 'Stealth Scraping',
    description: 'Scrape websites that use bot detection',
    icon: '🥷',
    exampleTask: 'Scrape data from https://protected-site.com bypassing bot detection',
    tools: ['webwright-stealth', 'playwright-extra', 'mitmproxy']
  }
]

export default function RETaskPage() {
  const [task, setTask] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [targetUrl, setTargetUrl] = useState('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [useStealth, setUseStealth] = useState(true)
  const [logs, setLogs] = useState<string[]>([])
  const [analyzedTask, setAnalyzedTask] = useState<AnalyzedTask | null>(null)

  const client = new WebWrightClient()

  // Real-time task analysis as user types
  useEffect(() => {
    if (task.trim().length > 10) {
      const analysis = analyzeTask(task)
      setAnalyzedTask(analysis)
    } else {
      setAnalyzedTask(null)
    }
  }, [task])

  const createRETaskMutation = useMutation({
    mutationFn: async (taskDescription: string) => {
      // Add log
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Starting RE task...`])
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Task: ${taskDescription}`])

      // Run the automation task
      const result = await client.runAgent(taskDescription, { stealth: useStealth })

      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Session started: ${result.sessionId}`])

      return result
    },
    onSuccess: (data) => {
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ✅ Task started successfully`])
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Session ID: ${data.sessionId}`])
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] View progress in Sessions tab`])

      alert(`RE Task started!\nSession ID: ${data.sessionId}\n\nView in Sessions tab.`)
    },
    onError: (error: any) => {
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ❌ Error: ${error.message}`])
      alert(`Error: ${error.message}\n\nMake sure WebWright daemon is running:\nwebwright daemon`)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!task.trim() && !selectedTemplate) return

    const finalTask = task.trim() || (selectedTemplate
      ? TASK_TEMPLATES.find(t => t.id === selectedTemplate)?.exampleTask || ''
      : '')

    createRETaskMutation.mutate(finalTask)
  }

  const handleTemplateClick = (template: TaskTemplate) => {
    setSelectedTemplate(template.id)
    setTask(template.exampleTask)
    setLogs([`[${new Date().toLocaleTimeString()}] Selected template: ${template.name}`])
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadedFile(file)
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Uploaded file: ${file.name}`])
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Reverse Engineering Tools</h1>
      <p className="text-gray-600 mb-8">
        Automated reverse engineering with professional tools - API discovery, UI cloning, GraphQL extraction, and more
      </p>

      {/* Task Templates */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Start Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TASK_TEMPLATES.map(template => (
            <button
              key={template.id}
              onClick={() => handleTemplateClick(template)}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                selectedTemplate === template.id
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'
              }`}
            >
              <div className="text-3xl mb-2">{template.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
              <p className="text-sm text-gray-600 mb-3">{template.description}</p>
              <div className="flex flex-wrap gap-1">
                {template.tools.map(tool => (
                  <span key={tool} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                    {tool}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Target URL Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Target URL
          </label>
          <input
            type="url"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            placeholder="https://example.com or https://api.example.com"
            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload File (APK, Binary, Screenshot)
          </label>
          <input
            type="file"
            onChange={handleFileUpload}
            accept=".apk,.jar,.bin,.png,.jpg,.jpeg"
            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          {uploadedFile && (
            <p className="mt-2 text-sm text-green-600">
              ✓ {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(2)} KB)
            </p>
          )}
        </div>

        {/* Task Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Task Description
          </label>
          <textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="e.g., Reverse engineer the API from https://cloud.browser-use.com"
            className="w-full h-40 px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent resize-none font-mono text-sm"
            required
          />
          <p className="mt-2 text-sm text-gray-500">
            Just describe what you want in plain English - the AI will understand and select the right tools.
          </p>
        </div>

        {/* AI Analysis Panel - Shows real-time understanding */}
        {analyzedTask && (
          <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🤖</span>
              <span className="font-semibold text-purple-900">AI Understanding</span>
              <span className="ml-auto text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                {(analyzedTask.confidence * 100).toFixed(0)}% confident
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Task Type:</span>
                <span className="ml-2 font-medium text-gray-900">{analyzedTask.type.replace(/_/g, ' ')}</span>
              </div>
              <div>
                <span className="text-gray-600">Target:</span>
                <span className="ml-2 font-medium text-gray-900">{analyzedTask.targetUrl || 'Not detected'}</span>
              </div>
            </div>
            <div className="mt-3">
              <span className="text-gray-600 text-sm">Tools:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {analyzedTask.tools.map(tool => (
                  <span key={tool} className="text-xs px-2 py-1 bg-white text-purple-700 rounded border border-purple-200">
                    {tool.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-3">
              <span className="text-gray-600 text-sm">Workflow:</span>
              <div className="mt-1 text-xs text-gray-700">
                {analyzedTask.workflow.slice(0, 3).map((step, i) => (
                  <span key={step.id}>
                    {i > 0 && ' → '}
                    {step.name}
                  </span>
                ))}
                {analyzedTask.workflow.length > 3 && <span className="text-gray-500"> (+{analyzedTask.workflow.length - 3} more)</span>}
              </div>
            </div>
          </div>
        )}

        {/* Stealth Mode Toggle */}
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-md border border-gray-200">
          <input
            type="checkbox"
            id="re-stealth-mode"
            checked={useStealth}
            onChange={(e) => setUseStealth(e.target.checked)}
            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
          />
          <label htmlFor="re-stealth-mode" className="text-sm text-gray-700 cursor-pointer">
            <span className="font-medium">🥷 Stealth Mode</span>
            <span className="text-gray-500 ml-2">(Bypass bot detection - recommended for web targets)</span>
          </label>
        </div>

        {/* Submit Button */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={createRETaskMutation.isPending || (!task.trim() && !selectedTemplate)}
            className="px-6 py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createRETaskMutation.isPending ? 'Starting RE Task...' : 'Start Reverse Engineering'}
          </button>

          {createRETaskMutation.isPending && (
            <div className="flex items-center text-sm text-gray-600">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
              Analyzing and executing...
            </div>
          )}
        </div>

        {/* Error Display */}
        {createRETaskMutation.isError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="text-sm text-red-800">
              <strong>Error:</strong> {(createRETaskMutation.error as any).message}
            </div>
            <div className="text-xs text-red-600 mt-2">
              Make sure the WebWright daemon is running on port 3456
            </div>
          </div>
        )}
      </form>

      {/* Live Logs */}
      {logs.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Execution Logs</h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm h-64 overflow-y-auto">
            {logs.map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))}
          </div>
        </div>
      )}

      {/* Info Panel */}
      <div className="mt-12 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-900 mb-3">Available Tools</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div>
            <strong>✅ Installed Tools:</strong>
            <ul className="mt-2 space-y-1 ml-4">
              <li>• mitmproxy - Traffic interception</li>
              <li>• WebWright + Stealth - Browser automation</li>
              <li>• Chrome DevTools - Built-in inspection</li>
              <li>• Kiterunner - API endpoint discovery</li>
            </ul>
          </div>
          <div>
            <strong>📋 Supported Scenarios:</strong>
            <ul className="mt-2 space-y-1 ml-4">
              <li>• REST API reverse engineering</li>
              <li>• GraphQL schema extraction</li>
              <li>• UI cloning from screenshots</li>
              <li>• Protobuf schema recovery</li>
              <li>• Stealth web scraping</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

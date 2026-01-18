import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { WebWrightClient } from '../lib/webwright-client'

export default function NewTaskPage() {
  const [task, setTask] = useState('')
  const [useStealth, setUseStealth] = useState(true)  // NEW: Stealth enabled by default
  const client = new WebWrightClient()

  const createTaskMutation = useMutation({
    mutationFn: (taskDescription: string) =>
      client.runAgent(taskDescription, { stealth: useStealth }),
    onSuccess: (data) => {
      alert(`Task started!\nSession ID: ${data.sessionId}\n\nView in Sessions tab.`)
      setTask('')
    },
    onError: (error: any) => {
      alert(`Error: ${error.message}\n\nMake sure WebWright daemon is running:\nwebwright daemon`)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!task.trim()) return
    createTaskMutation.mutate(task)
  }

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">New Automation Task</h1>
      <p className="text-gray-600 mb-8">
        Describe what you want the browser automation agent to do
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Task Description
          </label>
          <textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="e.g., Go to Hacker News and get the top 5 post titles"
            className="w-full h-40 px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            required
          />
          <p className="mt-2 text-sm text-gray-500">
            Be specific about what you want the agent to do. The agent will use WebWright to automate the browser.
          </p>
        </div>

        {/* NEW: Stealth Mode Toggle */}
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-md border border-gray-200">
          <input
            type="checkbox"
            id="stealth-mode"
            checked={useStealth}
            onChange={(e) => setUseStealth(e.target.checked)}
            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
          />
          <label htmlFor="stealth-mode" className="text-sm text-gray-700 cursor-pointer">
            <span className="font-medium">🥷 Stealth Mode</span>
            <span className="text-gray-500 ml-2">(Bypass bot detection - recommended)</span>
          </label>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={createTaskMutation.isPending || !task.trim()}
            className="px-6 py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createTaskMutation.isPending ? 'Starting Task...' : 'Start Task'}
          </button>

          {createTaskMutation.isPending && (
            <div className="flex items-center text-sm text-gray-600">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
              Connecting to WebWright daemon...
            </div>
          )}
        </div>

        {createTaskMutation.isError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="text-sm text-red-800">
              <strong>Error:</strong> {(createTaskMutation.error as any).message}
            </div>
            <div className="text-xs text-red-600 mt-2">
              Make sure the WebWright daemon is running on port 3456
            </div>
          </div>
        )}
      </form>

      <div className="mt-12 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Example Tasks</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Navigate to GitHub and search for "playwright"</li>
          <li>• Go to Amazon and find the price of "wireless mouse"</li>
          <li>• Open YouTube and get the title of the trending video</li>
          <li>• Visit Wikipedia and extract the first paragraph about "artificial intelligence"</li>
        </ul>
      </div>
    </div>
  )
}

import { useQuery } from '@tanstack/react-query'
import { WebWrightClient } from '../lib/webwright-client'

export default function DaemonStatus() {
  const client = new WebWrightClient()

  const { data: status, isLoading, error } = useQuery({
    queryKey: ['daemon-status'],
    queryFn: () => client.getDaemonStatus(),
    refetchInterval: 5000, // Check every 5 seconds
    retry: 1,
  })

  if (isLoading) {
    return (
      <div className="text-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400">Daemon Status</span>
          <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
        </div>
        <div className="text-xs text-gray-500">Checking...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400">Daemon Status</span>
          <div className="w-2 h-2 rounded-full bg-red-500" />
        </div>
        <div className="text-xs text-red-400">Offline</div>
        <div className="text-xs text-gray-500 mt-1">
          Start daemon: <code className="bg-gray-800 px-1 rounded">webwright daemon</code>
        </div>
      </div>
    )
  }

  return (
    <div className="text-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400">Daemon Status</span>
        <div className="w-2 h-2 rounded-full bg-green-500" />
      </div>
      <div className="text-xs text-gray-300">
        <div>Online • {status?.version || 'v1.0.0'}</div>
        <div className="text-gray-500 mt-1">
          {status?.sessions || 0} active session{status?.sessions !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  )
}

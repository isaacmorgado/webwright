import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { WebWrightClient, WebWrightSession } from '../lib/webwright-client'
import type { Session, Artifact, WorkflowStep } from '../types/electron'

// Tab type
type TabType = 'live' | 'saved'

export default function SessionsPage() {
  const client = new WebWrightClient()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabType>('saved')
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [sessionFolder, setSessionFolder] = useState<string>('')

  // Check if Electron API is available
  const isElectron = typeof window !== 'undefined' && window.electron

  // Get global WebWright paths
  useEffect(() => {
    if (isElectron && window.electron.paths) {
      window.electron.paths.get().then((paths: any) => {
        setSessionFolder(paths.global)
      })
    } else if (isElectron) {
      window.electron.sessions.getFolder().then(setSessionFolder)
    }
  }, [isElectron])

  // Open folder in Finder
  const openFolder = (folderPath: string) => {
    if (isElectron && window.electron.folder) {
      window.electron.folder.open(folderPath)
    }
  }

  // Live sessions from daemon
  const { data: liveSessions, isLoading: liveLoading } = useQuery({
    queryKey: ['live-sessions'],
    queryFn: () => client.listSessions(),
    refetchInterval: 2000,
    staleTime: 0,
    enabled: activeTab === 'live',
  })

  // Saved sessions from database
  const { data: savedSessionsResult, isLoading: savedLoading } = useQuery({
    queryKey: ['saved-sessions'],
    queryFn: async () => {
      if (!isElectron) return { success: false, sessions: [] as Session[] }
      return window.electron.sessions.list()
    },
    refetchInterval: 5000,
    enabled: activeTab === 'saved' && !!isElectron,
  })

  const savedSessions = (savedSessionsResult as { success: boolean; sessions?: Session[] })?.sessions || []

  // Mutations for live sessions
  const stopSessionMutation = useMutation({
    mutationFn: (sessionId: string) => client.stopSession(sessionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['live-sessions'] }),
  })

  const deleteLiveSessionMutation = useMutation({
    mutationFn: (sessionId: string) => client.deleteSession(sessionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['live-sessions'] }),
  })

  // Mutation for saved sessions
  const deleteSavedSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      if (!isElectron) throw new Error('Electron not available')
      return window.electron.sessions.delete(sessionId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-sessions'] })
      setSelectedSession(null)
    },
  })

  // Listen for real-time updates
  useEffect(() => {
    if (!isElectron) return

    const handleSessionUpdated = (session: Session) => {
      queryClient.invalidateQueries({ queryKey: ['saved-sessions'] })
      if (selectedSession?.id === session.id) {
        setSelectedSession(session)
      }
    }

    const handleSessionDeleted = (id: string) => {
      queryClient.invalidateQueries({ queryKey: ['saved-sessions'] })
      if (selectedSession?.id === id) {
        setSelectedSession(null)
      }
    }

    const handleArtifactAdded = () => {
      queryClient.invalidateQueries({ queryKey: ['saved-sessions'] })
      if (selectedSession) {
        window.electron.sessions.get(selectedSession.id).then((res) => {
          if (res.success && res.session) {
            setSelectedSession(res.session)
          }
        })
      }
    }

    window.electron.on('session:updated', handleSessionUpdated)
    window.electron.on('session:deleted', handleSessionDeleted)
    window.electron.on('artifact:added', handleArtifactAdded)

    return () => {
      window.electron.off('session:updated', handleSessionUpdated)
      window.electron.off('session:deleted', handleSessionDeleted)
      window.electron.off('artifact:added', handleArtifactAdded)
    }
  }, [isElectron, queryClient, selectedSession])

  const isLoading = activeTab === 'live' ? liveLoading : savedLoading

  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className="flex-1 p-8 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Sessions</h1>

          {/* Tab switcher */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('saved')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'saved'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Saved Sessions
            </button>
            <button
              onClick={() => setActiveTab('live')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'live'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Live Sessions
            </button>
          </div>
        </div>

        {sessionFolder && (
          <div className="mb-4 flex items-center gap-2 text-xs text-gray-500">
            <span>Sessions stored at:</span>
            <code className="bg-gray-100 px-2 py-1 rounded">{sessionFolder}</code>
            <button
              onClick={() => openFolder(sessionFolder)}
              className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-gray-700 transition-colors"
            >
              Open Folder
            </button>
          </div>
        )}

        {isLoading && (
          <div className="text-gray-500">Loading sessions...</div>
        )}

        {/* Saved sessions */}
        {activeTab === 'saved' && !isLoading && (
          <>
            {!isElectron ? (
              <div className="text-center py-12 text-gray-500">
                Session storage is only available in the Electron app
              </div>
            ) : savedSessions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-lg mb-2">No saved sessions</div>
                <div className="text-gray-500 text-sm">
                  Run an RE task to create a session
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {savedSessions.map((session: Session) => (
                  <div
                    key={session.id}
                    onClick={() => setSelectedSession(session)}
                    className={`bg-white border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedSession?.id === session.id
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <StatusBadge status={session.status} />
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                            {session.task_type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(session.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-gray-900 font-medium truncate">
                          {session.task_description}
                        </div>
                        {session.target_url && (
                          <div className="text-xs text-gray-500 truncate mt-1">
                            {session.target_url}
                          </div>
                        )}
                        {session.summary && (
                          <div className="text-xs text-gray-600 mt-2">
                            {session.summary}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm('Delete this session and all artifacts?')) {
                            deleteSavedSessionMutation.mutate(session.id)
                          }
                        }}
                        className="ml-4 p-2 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Live sessions */}
        {activeTab === 'live' && !isLoading && (
          <>
            {!liveSessions || liveSessions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-lg mb-2">No live sessions</div>
                <div className="text-gray-500 text-sm">
                  Start the WebWright daemon to see live sessions
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {liveSessions.map((session: WebWrightSession) => (
                  <div
                    key={session.id}
                    className="bg-white border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <StatusBadge status={session.status} />
                          <span className="text-xs text-gray-500">
                            {new Date(session.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-gray-900 font-medium">{session.task}</div>
                        {session.url && (
                          <div className="text-xs text-gray-500 mt-1">{session.url}</div>
                        )}
                        {session.error && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                            {session.error}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        {session.status === 'running' && (
                          <button
                            onClick={() => stopSessionMutation.mutate(session.id)}
                            disabled={stopSessionMutation.isPending}
                            className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded-md transition-colors disabled:opacity-50"
                          >
                            Stop
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm('Delete this session?')) {
                              deleteLiveSessionMutation.mutate(session.id)
                            }
                          }}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Session detail sidebar */}
      {selectedSession && (
        <div className="w-96 border-l border-gray-200 bg-gray-50 overflow-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Session Details</h2>
              <button
                onClick={() => setSelectedSession(null)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Session info */}
            <div className="space-y-4">
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Task</div>
                <div className="text-sm text-gray-900">{selectedSession.task_description}</div>
              </div>

              <div className="flex gap-4">
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Status</div>
                  <StatusBadge status={selectedSession.status} />
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Type</div>
                  <div className="text-sm text-gray-900">{selectedSession.task_type.replace(/_/g, ' ')}</div>
                </div>
              </div>

              {selectedSession.target_url && (
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Target URL</div>
                  <a
                    href={selectedSession.target_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline break-all"
                  >
                    {selectedSession.target_url}
                  </a>
                </div>
              )}

              {selectedSession.confidence !== null && (
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Confidence</div>
                  <div className="text-sm text-gray-900">{(selectedSession.confidence * 100).toFixed(0)}%</div>
                </div>
              )}

              {selectedSession.tools && selectedSession.tools.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Tools</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedSession.tools.map((tool: string) => (
                      <span key={tool} className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded">
                        {tool.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Artifacts */}
              {selectedSession.artifacts && selectedSession.artifacts.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Artifacts</div>
                  <div className="space-y-2">
                    {selectedSession.artifacts.map((artifact: Artifact) => (
                      <div
                        key={artifact.id}
                        className="flex items-center gap-2 p-2 bg-white rounded border border-gray-200"
                      >
                        <ArtifactIcon type={artifact.type} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {artifact.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {artifact.type} {artifact.size ? `- ${formatBytes(artifact.size)}` : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Workflow Steps */}
              {selectedSession.steps && selectedSession.steps.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Workflow Steps</div>
                  <div className="space-y-1">
                    {selectedSession.steps.map((step: WorkflowStep, index: number) => (
                      <div
                        key={step.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span className="w-5 h-5 flex items-center justify-center">
                          {step.status === 'completed' ? (
                            <span className="text-green-500">✓</span>
                          ) : step.status === 'failed' ? (
                            <span className="text-red-500">✗</span>
                          ) : step.status === 'running' ? (
                            <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <span className="text-gray-300">{index + 1}</span>
                          )}
                        </span>
                        <span className={step.status === 'failed' ? 'text-red-600' : 'text-gray-700'}>
                          {step.step_name}
                        </span>
                        {step.duration && (
                          <span className="text-xs text-gray-400 ml-auto">
                            {(step.duration / 1000).toFixed(1)}s
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Folder path */}
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Folder</div>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded flex-1 break-all">
                    {selectedSession.folder_path.split('/').slice(-1)[0]}
                  </code>
                  <button
                    onClick={() => openFolder(selectedSession.folder_path)}
                    className="px-2 py-1 bg-primary text-white text-xs rounded hover:bg-primary/90 transition-colors whitespace-nowrap"
                  >
                    Open
                  </button>
                </div>
              </div>

              {/* Timestamps */}
              <div className="flex gap-4 text-xs text-gray-500">
                <div>Created: {new Date(selectedSession.created_at).toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper components
function StatusBadge({ status }: { status: string }) {
  const colors = {
    running: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    failed: 'bg-red-100 text-red-800',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  )
}

function ArtifactIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    screenshot: '📷',
    snapshot: '📋',
    har: '🌐',
    elements: '🧩',
    api_endpoints: '🔌',
    code: '💻',
  }
  return <span className="text-lg">{icons[type] || '📄'}</span>
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

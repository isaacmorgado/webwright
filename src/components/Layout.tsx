import { Link, useLocation } from 'react-router-dom'
import DaemonStatus from './DaemonStatus'

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'New Task', icon: '✨' },
    { path: '/reverse-engineering', label: 'Reverse Engineering', icon: '🔍' },
    { path: '/sessions', label: 'Sessions', icon: '📋' },
    { path: '/devtools', label: 'DevTools', icon: '🔧' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
  ]

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-xl font-bold">WebWright</h1>
          <p className="text-xs text-gray-400 mt-1">Browser Automation</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`block px-4 py-2 rounded-md transition-colors ${
                location.pathname === item.path
                  ? 'bg-primary text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Daemon Status */}
        <div className="p-4 border-t border-gray-800">
          <DaemonStatus />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800">
          <div className="text-xs text-gray-500 text-center">
            WebWright Desktop v1.0.0
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}

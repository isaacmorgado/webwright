import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import NewTaskPage from './pages/NewTaskPage'
import RETaskPage from './pages/RETaskPage'
import SessionsPage from './pages/SessionsPage'
import DevToolsPage from './pages/DevToolsPage'
import SettingsPage from './pages/SettingsPage'

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<NewTaskPage />} />
          <Route path="/reverse-engineering" element={<RETaskPage />} />
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/devtools" element={<DevToolsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App

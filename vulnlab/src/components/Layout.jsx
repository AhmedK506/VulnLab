import { createContext, useContext, useState, useEffect } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import ScanModal from './ScanModal.jsx'
import Assistant from './Assistant.jsx'
import { isAuthed } from '../lib/auth.js'
import { getSettings } from '../lib/manage.js'
import { setUserTimezone } from '../lib/scans.js'

const ScanCtx = createContext(() => {})
export const useNewScan = () => useContext(ScanCtx)

export default function Layout() {
  const [scanOpen, setScanOpen] = useState(false)

  useEffect(() => {
    getSettings().then((r) => {
      if (r.ok && r.settings?.timezone) setUserTimezone(r.settings.timezone)
    })
  }, [])

  if (!isAuthed()) return <Navigate to="/login" replace />

  return (
    <ScanCtx.Provider value={() => setScanOpen(true)}>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
      {scanOpen && <ScanModal onClose={() => setScanOpen(false)} />}
      <Assistant />
    </ScanCtx.Provider>
  )
}

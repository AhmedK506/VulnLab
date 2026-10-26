import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import Layout, { useNewScan } from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Results from './pages/Results.jsx'
import ScanDetail from './pages/ScanDetail.jsx'
import Scheduled from './pages/Scheduled.jsx'
import Trends from './pages/Trends.jsx'
import Reports from './pages/Reports.jsx'
import Settings from './pages/Settings.jsx'

// /scan just opens the scan modal, then bounces to the dashboard
function ScanRedirect() {
  const openScan = useNewScan()
  const navigate = useNavigate()
  useEffect(() => { openScan(); navigate('/', { replace: true }) }, [])
  return null
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/scan" element={<ScanRedirect />} />
        <Route path="/results" element={<Results />} />
        <Route path="/results/:id" element={<ScanDetail />} />
        <Route path="/scheduled" element={<Scheduled />} />
        <Route path="/trends" element={<Trends />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

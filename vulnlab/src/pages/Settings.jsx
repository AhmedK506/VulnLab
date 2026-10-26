import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../components/Topbar.jsx'
import { Card } from '../components/ui.jsx'
import { currentUser, logout, updateAccount } from '../lib/auth.js'
import { getSettings, saveSettings } from '../lib/manage.js'
import { setUserTimezone } from '../lib/scans.js'

export default function Settings() {
  const navigate = useNavigate()
  const user = currentUser()
  const [settings, setSettings] = useState({ reportEmail: '', emailNotifications: true, weeklyDigest: false, timezone: 'Asia/Kuala_Lumpur' })
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    getSettings().then((r) => {
      if (r.ok) { setSettings(r.settings); if (r.settings.timezone) setUserTimezone(r.settings.timezone) }
    })
  }, [])

  function flash(text, ok = true) { setMsg({ text, ok }); setTimeout(() => setMsg(null), 2500) }

  async function saveAccount() {
    if (!newEmail && !newPassword) { flash('Nothing to update.', false); return }
    const res = await updateAccount({ newEmail: newEmail || undefined, newPassword: newPassword || undefined })
    if (res.ok) { setNewEmail(''); setNewPassword(''); flash('Account updated.') }
    else flash(res.error, false)
  }

  async function saveNotif(patch) {
    const next = { ...settings, ...patch }
    setSettings(next)
    const res = await saveSettings(patch)
    flash(res.ok ? 'Settings saved.' : (res.error || 'Could not save.'), res.ok)
  }

  async function saveTimezone(tz) {
    setSettings({ ...settings, timezone: tz })
    setUserTimezone(tz)  // apply immediately so dates re-render in the new zone
    const res = await saveSettings({ timezone: tz })
    flash(res.ok ? 'Timezone updated.' : (res.error || 'Could not save.'), res.ok)
  }

  function doLogout() { logout(); navigate('/login') }

  return (
    <>
      <Topbar title="Settings" subtitle={user?.email} />
      <div style={{ padding: 26, maxWidth: 620 }}>
        {msg && (
          <div style={{
            fontSize: 12.5, padding: '9px 12px', borderRadius: 8, marginBottom: 16,
            background: msg.ok ? 'rgba(74,222,128,0.12)' : 'rgba(255,59,92,0.12)',
            border: `0.5px solid ${msg.ok ? 'var(--low)' : 'var(--critical)'}`,
            color: msg.ok ? '#a7f3c4' : '#ffb3c1',
          }}>{msg.text}</div>
        )}

        <Card style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Account</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginBottom: 16 }}>Signed in as {user?.name} ({user?.email})</div>

          <label style={{ fontSize: 12, color: 'var(--text-dim)' }}>Change email</label>
          <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder={user?.email} style={{ width: '100%', margin: '6px 0 14px' }} />

          <label style={{ fontSize: 12, color: 'var(--text-dim)' }}>Change password</label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" style={{ width: '100%', margin: '6px 0 16px' }} />

          <button onClick={saveAccount} style={{ background: 'var(--primary)', color: 'var(--primary-ink)', fontSize: 13.5, fontWeight: 500, padding: '10px 16px' }}>Save account</button>
        </Card>

        <Card style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>Notifications</div>

          <label style={{ fontSize: 12, color: 'var(--text-dim)' }}>Send reports to</label>
          <div style={{ display: 'flex', gap: 8, margin: '6px 0 16px' }}>
            <input value={settings.reportEmail} onChange={(e) => setSettings({ ...settings, reportEmail: e.target.value })} placeholder="you@example.com" style={{ flex: 1 }} />
            <button onClick={() => saveNotif({ reportEmail: settings.reportEmail })} style={{ background: 'var(--surface-2)', color: 'var(--text)', fontSize: 13, padding: '10px 14px' }}>Update</button>
          </div>

          <Toggle label="Email me when a scan completes" checked={settings.emailNotifications} onChange={(v) => saveNotif({ emailNotifications: v })} />
          <Toggle label="Send a weekly summary digest" checked={settings.weeklyDigest} onChange={(v) => saveNotif({ weeklyDigest: v })} />

          <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 14, marginTop: 6 }}>
            <label style={{ fontSize: 12, color: 'var(--text-dim)' }}>Timezone (how dates & times are shown)</label>
            <select
              value={settings.timezone}
              onChange={(e) => saveTimezone(e.target.value)}
              style={{ width: '100%', marginTop: 6 }}
            >
              <option value="Asia/Kuala_Lumpur">Malaysia (UTC+8) — Kuala Lumpur</option>
              <option value="Asia/Singapore">Singapore (UTC+8)</option>
              <option value="Asia/Dubai">Gulf (UTC+4) — Dubai</option>
              <option value="Asia/Kolkata">India (UTC+5:30)</option>
              <option value="Europe/London">UK (UTC+0/+1) — London</option>
              <option value="Europe/Paris">Central Europe (UTC+1/+2)</option>
              <option value="America/New_York">US Eastern</option>
              <option value="America/Los_Angeles">US Pacific</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Session</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginBottom: 16 }}>Sign out of VulnLab on this device.</div>
          <button onClick={doLogout} style={{ background: 'transparent', border: '0.5px solid var(--critical)', color: 'var(--critical)', fontSize: 13.5, fontWeight: 500, padding: '10px 16px' }}>Log out</button>
        </Card>
      </div>
    </>
  )
}

function Toggle({ label, checked, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '0.5px solid var(--border)' }}>
      <span style={{ fontSize: 13 }}>{label}</span>
      <button onClick={() => onChange(!checked)} style={{
        width: 40, height: 22, borderRadius: 20, position: 'relative',
        background: checked ? 'var(--primary)' : 'var(--surface-2)', transition: 'background .15s',
      }}>
        <span style={{ position: 'absolute', top: 3, left: checked ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: checked ? 'var(--primary-ink)' : 'var(--text-dim)', transition: 'left .15s' }} />
      </button>
    </div>
  )
}

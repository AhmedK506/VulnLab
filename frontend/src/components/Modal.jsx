export default function Modal({ title, onClose, children, width = 440 }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(3,6,12,0.66)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width, maxWidth: '92vw', background: 'var(--surface)',
          border: '0.5px solid var(--border)', borderRadius: 14, padding: 24,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 500 }}>{title}</div>
          <button onClick={onClose} style={{
            background: 'transparent', color: 'var(--text-dim)', width: 30, height: 30,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 12, color: 'var(--text-dim)', display: 'block', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

export function PrimaryButton({ children, onClick, style }) {
  return (
    <button onClick={onClick} style={{
      background: 'var(--primary)', color: 'var(--primary-ink)',
      fontSize: 14, fontWeight: 500, padding: '11px 16px', ...style,
    }}>
      {children}
    </button>
  )
}

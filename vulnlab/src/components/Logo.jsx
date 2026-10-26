export default function Logo({ size = 28, showText = true }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <path
          d="M16 2 L28 7 V16 C28 24 22 29 16 31 C10 29 4 24 4 16 V7 Z"
          fill="#0A1620"
          stroke="var(--primary)"
          strokeWidth="1.6"
        />
        <path
          d="M9 17 L13 17 L15 11 L18 22 L20 17 L23 17"
          stroke="var(--primary)"
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showText && (
        <span style={{ fontSize: size * 0.62, fontWeight: 500, color: 'var(--text)' }}>
          Vuln<span style={{ color: 'var(--primary)' }}>Lab</span>
        </span>
      )}
    </div>
  )
}

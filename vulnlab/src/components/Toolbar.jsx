export default function Toolbar({ search, onSearch, filters, sort, onSort, right }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)"
          strokeWidth="1.8" style={{ position: 'absolute', left: 12, top: 11 }}>
          <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" strokeLinecap="round" />
        </svg>
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search by URL…"
          style={{ width: '100%', paddingLeft: 34 }}
        />
      </div>

      {filters}

      {sort && (
        <select value={sort.value} onChange={(e) => onSort(e.target.value)} style={{ minWidth: 150 }}>
          {sort.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}

      {right}
    </div>
  )
}

export function SearchBar({ value, onChange, placeholder = 'Buscar...', style }) {
  return (
    <div style={{ position: 'relative', ...style }}>
      <span
        style={{
          position: 'absolute', left: '12px', top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--color-ink-4)', fontSize: '14px', pointerEvents: 'none',
        }}
      >
        🔍
      </span>
      <input
        className="input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ paddingLeft: '36px' }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          style={{
            position: 'absolute', right: '10px', top: '50%',
            transform: 'translateY(-50%)',
            border: 'none', background: 'none', cursor: 'pointer',
            color: 'var(--color-ink-4)', fontSize: '14px', lineHeight: 1,
          }}
        >
          ✕
        </button>
      )}
    </div>
  )
}

export function FilterSelect({ label, value, onChange, options }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '140px' }}>
      {label && <span className="label">{label}</span>}
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

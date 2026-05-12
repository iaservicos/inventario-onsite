'use client';

export default function FilterBar({ filters, onChange, technicians = [], statusOptions = [], children }) {
  function update(key, value) {
    onChange({ ...filters, [key]: value });
  }

  const defaultStatus = [
    { value: '', label: 'Todos os status' },
    { value: 'pending', label: 'Pendente' },
    { value: 'in_progress', label: 'Em Andamento' },
    { value: 'completed', label: 'Concluído' },
    { value: 'abandoned', label: 'Abandonado' },
    { value: 'recount_pending', label: 'Recontagem' },
  ];

  const statuses = statusOptions.length > 0 ? statusOptions : defaultStatus;

  return (
    <div className="filter-bar">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
      </svg>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
        <input
          type="date"
          className="input"
          style={{ width: '140px' }}
          value={filters.from || ''}
          onChange={(e) => update('from', e.target.value)}
        />
        <span style={{ color: '#a3a3a3', fontSize: '0.8rem' }}>até</span>
        <input
          type="date"
          className="input"
          style={{ width: '140px' }}
          value={filters.to || ''}
          onChange={(e) => update('to', e.target.value)}
        />
      </div>

      <select
        className="input"
        style={{ width: '180px' }}
        value={filters.technicianId || ''}
        onChange={(e) => update('technicianId', e.target.value)}
      >
        <option value="">Todos os técnicos</option>
        {technicians.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>

      <select
        className="input"
        style={{ width: '180px' }}
        value={filters.status || ''}
        onChange={(e) => update('status', e.target.value)}
      >
        {statuses.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      {(filters.from || filters.to || filters.technicianId || filters.status) && (
        <button
          className="btn btn-ghost"
          style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
          onClick={() => onChange({ from: '', to: '', technicianId: '', status: '' })}
        >
          Limpar
        </button>
      )}

      {children}
    </div>
  );
}

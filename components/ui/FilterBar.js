'use client';

const DEFAULT_STATUS = [
  { value: '', label: 'Todos os status' },
  { value: 'pending', label: 'Pendente' },
  { value: 'in_progress', label: 'Em Andamento' },
  { value: 'completed', label: 'Concluido' },
  { value: 'abandoned', label: 'Abandonado' },
  { value: 'recount_pending', label: 'Recontagem' },
];

export default function FilterBar({ filters, onChange, technicians = [], supervisors = [], statusOptions, children }) {
  const statuses = statusOptions || DEFAULT_STATUS;
  const hasFilters = filters.from || filters.to || filters.technicianId || filters.status || filters.supervisor;

  const visibleTechs = filters.supervisor
    ? technicians.filter(t => t.supervisor_name === filters.supervisor)
    : technicians;

  return (
    <div className="filter-bar">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
      </svg>

      <input
        type="date"
        className="input"
        style={{ width: 'auto', minWidth: '130px' }}
        value={filters.from || ''}
        onChange={(e) => onChange({ ...filters, from: e.target.value })}
      />
      <span style={{ fontSize: '0.75rem', color: '#a1a1aa', flexShrink: 0 }}>ate</span>
      <input
        type="date"
        className="input"
        style={{ width: 'auto', minWidth: '130px' }}
        value={filters.to || ''}
        onChange={(e) => onChange({ ...filters, to: e.target.value })}
      />

      {supervisors.length > 0 && (
        <select
          className="input"
          style={{ width: 'auto', minWidth: '170px' }}
          value={filters.supervisor || ''}
          onChange={(e) => onChange({ ...filters, supervisor: e.target.value, technicianId: '' })}
        >
          <option value="">Todos os supervisores</option>
          {supervisors.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      )}

      {visibleTechs.length > 0 && (
        <select
          className="input"
          style={{ width: 'auto', minWidth: '160px' }}
          value={filters.technicianId || ''}
          onChange={(e) => onChange({ ...filters, technicianId: e.target.value })}
        >
          <option value="">Todos os tecnicos</option>
          {visibleTechs.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      )}

      <select
        className="input"
        style={{ width: 'auto', minWidth: '150px' }}
        value={filters.status || ''}
        onChange={(e) => onChange({ ...filters, status: e.target.value })}
      >
        {statuses.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      {children}

      {hasFilters && (
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => onChange({ from: '', to: '', technicianId: '', status: '', supervisor: '' })}
        >
          Limpar
        </button>
      )}
    </div>
  );
}

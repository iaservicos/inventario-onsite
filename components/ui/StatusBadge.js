export default function StatusBadge({ status, size = 'sm' }) {
  const config = {
    pending:         { label: 'Pendente',      cls: 'badge-neutral' },
    in_progress:     { label: 'Em Andamento',  cls: 'badge-info' },
    completed:       { label: 'Concluído',     cls: 'badge-success' },
    abandoned:       { label: 'Abandonado',    cls: 'badge-error' },
    recount_pending: { label: 'Recontagem',    cls: 'badge-warning' },
    open:            { label: 'Aberta',        cls: 'badge-error' },
    recount:         { label: 'Recontagem',    cls: 'badge-warning' },
    validated:       { label: 'Validada',      cls: 'badge-success' },
    adjusted:        { label: 'Ajustada',      cls: 'badge-neutral' },
    low:             { label: 'Baixo',         cls: 'badge-info' },
    medium:          { label: 'Médio',         cls: 'badge-warning' },
    high:            { label: 'Alto',          cls: 'badge-error' },
    critical:        { label: 'Crítico',       cls: 'badge-error' },
    healthy:         { label: 'Saudável',      cls: 'badge-success' },
    degraded:        { label: 'Degradado',     cls: 'badge-warning' },
    down:            { label: 'Indisponível',  cls: 'badge-error' },
    info:            { label: 'Info',          cls: 'badge-info' },
    warning:         { label: 'Aviso',         cls: 'badge-warning' },
    error:           { label: 'Erro',          cls: 'badge-error' },
    success:         { label: 'Sucesso',       cls: 'badge-success' },
  };

  const { label, cls } = config[status] || { label: status, cls: 'badge-neutral' };

  return (
    <span
      className={`badge ${cls}`}
      style={size === 'xs' ? { fontSize: '0.65rem', padding: '1px 7px' } : {}}
    >
      {label}
    </span>
  );
}

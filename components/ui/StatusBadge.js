const STATUS_MAP = {
  completed:      { label: 'Concluido',    cls: 'badge-success' },
  in_progress:    { label: 'Em Andamento', cls: 'badge-info' },
  abandoned:      { label: 'Abandonado',   cls: 'badge-error' },
  recount_pending:{ label: 'Recontagem',   cls: 'badge-warning' },
  pending:        { label: 'Pendente',     cls: 'badge-neutral' },
  resolved:       { label: 'Resolvido',    cls: 'badge-success' },
  open:           { label: 'Aberto',       cls: 'badge-warning' },
  critical:       { label: 'Critico',      cls: 'badge-error' },
  warning:        { label: 'Atencao',      cls: 'badge-warning' },
  info:           { label: 'Info',         cls: 'badge-info' },
  healthy:        { label: 'Saudavel',     cls: 'badge-success' },
  degraded:       { label: 'Degradado',    cls: 'badge-warning' },
  down:           { label: 'Inativo',      cls: 'badge-error' },
  error:          { label: 'Erro',         cls: 'badge-error' },
  active:         { label: 'Ativo',        cls: 'badge-active' },
  inactive:       { label: 'Inativo',      cls: 'badge-inactive' },
};

export default function StatusBadge({ status, size }) {
  const cfg = STATUS_MAP[status] || { label: status || '—', cls: 'badge-neutral' };
  return (
    <span
      className={`badge ${cfg.cls}`}
      style={size === 'xs' ? { fontSize: '0.625rem', padding: '0.15rem 0.45rem' } : undefined}
    >
      {cfg.label}
    </span>
  );
}

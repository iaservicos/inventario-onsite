// Todos os badges em escala de cinza — sem cores de destaque
const STATUS_MAP = {
  // Inventário
  completed:       { label: 'Concluído',    cls: 'badge-success' },
  in_progress:     { label: 'Em Andamento', cls: 'badge-info' },
  abandoned:       { label: 'Abandonado',   cls: 'badge-error' },
  recount_pending: { label: '1ª Contagem',  cls: 'badge-warning' },
  pending:         { label: 'Divergente',   cls: 'badge-neutral' },
  cancelled:       { label: 'Cancelado',    cls: 'badge-neutral' },
  dispatched:      { label: 'Recontagem',   cls: 'badge-info' },
  // Divergências
  open:            { label: 'Aberta',       cls: 'badge-warning' },
  recount:         { label: 'Recontagem',   cls: 'badge-warning' },
  tratativa:       { label: 'Em Tratativa', cls: 'badge-info' },
  validated:       { label: 'Validada',     cls: 'badge-success' },
  adjusted:        { label: 'Ajustada',     cls: 'badge-success' },
  // Itens
  counted:         { label: 'Contado',      cls: 'badge-success' },
  // Sistema
  resolved:        { label: 'Resolvido',    cls: 'badge-success' },
  critical:        { label: 'Crítico',      cls: 'badge-error' },
  warning:         { label: 'Atenção',      cls: 'badge-warning' },
  info:            { label: 'Info',         cls: 'badge-info' },
  healthy:         { label: 'Saudável',     cls: 'badge-success' },
  degraded:        { label: 'Degradado',    cls: 'badge-warning' },
  down:            { label: 'Inativo',      cls: 'badge-error' },
  error:           { label: 'Erro',         cls: 'badge-error' },
  active:          { label: 'Ativo',        cls: 'badge-active' },
  inactive:        { label: 'Inativo',      cls: 'badge-inactive' },
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

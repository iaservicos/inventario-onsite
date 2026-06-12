import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(date) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(date));
}

export function formatDuration(startedAt, completedAt) {
  if (!startedAt) return '—';
  const end = completedAt ? new Date(completedAt) : new Date();
  const diffMs = end - new Date(startedAt);
  const totalMin = Math.floor(diffMs / 60000);
  if (totalMin < 60) return `${totalMin}min`;
  return `${Math.floor(totalMin / 60)}h ${totalMin % 60}min`;
}

export function calcCompletionRate(counted, total) {
  if (!total || total === 0) return 0;
  return Math.round((counted / total) * 100);
}

export const STATUS_LABELS = {
  pending: 'Pendente',
  in_progress: 'Em Andamento',
  completed: 'Concluído',
  abandoned: 'Abandonado',
  recount_pending: 'Recontagem',
};

export const ROLE_LABELS = {
  admin:         'Administrador',
  supervisor:    'Supervisor',
  coordinator:   'Coordenador',
  analyst:       'Analista',
  analista_custo: 'Analista de Custos',
};

export const SEVERITY_LABELS = {
  low: 'Baixo',
  medium: 'Médio',
  high: 'Alto',
  critical: 'Crítico',
};

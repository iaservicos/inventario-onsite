// Modelo de dados para Veículos/Frotas

export const FrotaSchema = {
  id: { type: 'uuid', primaryKey: true, generated: 'uuid' },
  placa: { type: 'string', unique: true, required: true },
  modelo: { type: 'string', required: true },
  ano: { type: 'number', required: true },
  marca: { type: 'string', required: true },
  kmAtual: { type: 'number', defaultValue: 0 },
  status: {
    type: 'enum',
    values: ['Ativo', 'Parado', 'Manutenção', 'Descartado'],
    defaultValue: 'Ativo'
  },
  tecnicoAssignado: { type: 'uuid', nullable: true, references: 'tecnicos.id' },
  ultimaManutencao: { type: 'date', nullable: true },
  proximaManutencao: { type: 'date', nullable: true },
  combustivel: { type: 'number', defaultValue: 0, comment: 'Litros' },
  observacoes: { type: 'text', nullable: true },
  createdAt: { type: 'timestamp', defaultValue: 'now()' },
  updatedAt: { type: 'timestamp', defaultValue: 'now()' },
  deletedAt: { type: 'timestamp', nullable: true }
};

export const FrotaValidations = {
  placa: (val) => /^[A-Z]{3}-\d{4}$|^[A-Z]{3}\d[A-Z]\d{2}$/.test(val) || 'Placa inválida',
  modelo: (val) => val && val.length > 0 || 'Modelo obrigatório',
  ano: (val) => val >= 1990 && val <= new Date().getFullYear() || 'Ano inválido',
  marca: (val) => val && val.length > 0 || 'Marca obrigatória',
  kmAtual: (val) => val >= 0 || 'KM não pode ser negativo',
  status: (val) => ['Ativo', 'Parado', 'Manutenção', 'Descartado'].includes(val) || 'Status inválido'
};

export const formatFrota = (data) => ({
  ...data,
  ultimaManutencao: data.ultimaManutencao ? new Date(data.ultimaManutencao).toLocaleDateString('pt-BR') : '—',
  proximaManutencao: data.proximaManutencao ? new Date(data.proximaManutencao).toLocaleDateString('pt-BR') : '—',
  statusBadge: {
    'Ativo': 'green',
    'Parado': 'gray',
    'Manutenção': 'amber',
    'Descartado': 'red'
  }[data.status]
});

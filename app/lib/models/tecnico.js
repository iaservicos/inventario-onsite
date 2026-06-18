// Modelo de dados para Técnicos e Atendimentos

export const TecnicoSchema = {
  id: { type: 'uuid', primaryKey: true, generated: 'uuid' },
  matricula: { type: 'string', unique: true, required: true },
  nome: { type: 'string', required: true },
  email: { type: 'string', unique: true, required: true },
  telefone: { type: 'string', nullable: true },
  atp: { type: 'string', required: true, comment: 'Assistência Técnica' },
  status: {
    type: 'enum',
    values: ['Ativo', 'Inativo', 'Afastado'],
    defaultValue: 'Ativo'
  },
  frotaId: { type: 'uuid', nullable: true, references: 'frotas.id' },
  createdAt: { type: 'timestamp', defaultValue: 'now()' },
  updatedAt: { type: 'timestamp', defaultValue: 'now()' }
};

export const ChamadoSchema = {
  id: { type: 'uuid', primaryKey: true, generated: 'uuid' },
  numero: { type: 'string', unique: true, required: true },
  tecnicoId: { type: 'uuid', required: true, references: 'tecnicos.id' },
  frotaId: { type: 'uuid', nullable: true, references: 'frotas.id' },
  statusChamado: {
    type: 'enum',
    values: ['Aberto', 'Em Atendimento', 'Pausado', 'Finalizado'],
    defaultValue: 'Aberto'
  },
  dataAbertura: { type: 'timestamp', defaultValue: 'now()' },
  dataFechamento: { type: 'timestamp', nullable: true },
  descricao: { type: 'text', nullable: true },
  observacaoFinal: { type: 'text', nullable: true },
  duracao: { type: 'number', nullable: true, comment: 'Minutos' },
  createdAt: { type: 'timestamp', defaultValue: 'now()' },
  updatedAt: { type: 'timestamp', defaultValue: 'now()' }
};

export const PontoSchema = {
  id: { type: 'uuid', primaryKey: true, generated: 'uuid' },
  tecnicoId: { type: 'uuid', required: true, references: 'tecnicos.id' },
  data: { type: 'date', required: true },
  tipo: {
    type: 'enum',
    values: ['ENTRADA', 'SAÍDA'],
    required: true
  },
  hora: { type: 'time', required: true },
  latitude: { type: 'float', nullable: true },
  longitude: { type: 'float', nullable: true },
  status: {
    type: 'enum',
    values: ['Registrado', 'Ajuste Pendente', 'Ajustado'],
    defaultValue: 'Registrado'
  },
  createdAt: { type: 'timestamp', defaultValue: 'now()' }
};

export const TecnicoValidations = {
  matricula: (val) => /^\d{6,8}$/.test(val) || 'Matrícula deve ter 6-8 dígitos',
  nome: (val) => val && val.length >= 3 || 'Nome deve ter pelo menos 3 caracteres',
  email: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || 'Email inválido',
  atp: (val) => val && val.length > 0 || 'ATP obrigatória',
  status: (val) => ['Ativo', 'Inativo', 'Afastado'].includes(val) || 'Status inválido'
};

export const formatTecnico = (data) => ({
  ...data,
  iniciais: (data.nome || '')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
});

export const formatChamado = (data) => ({
  ...data,
  dataAberturaFormatada: new Date(data.dataAbertura).toLocaleDateString('pt-BR'),
  dataFechamentoFormatada: data.dataFechamento ? new Date(data.dataFechamento).toLocaleDateString('pt-BR') : '—',
  statusBadge: {
    'Aberto': 'blue',
    'Em Atendimento': 'green',
    'Pausado': 'amber',
    'Finalizado': 'gray'
  }[data.statusChamado]
});

export const formatPonto = (data) => ({
  ...data,
  horaFormatada: data.hora || '—',
  tipoLabel: data.tipo === 'ENTRADA' ? '📍 Entrada' : '📤 Saída',
  temGPS: data.latitude && data.longitude ? 'Sim' : 'Não'
});

# 📋 PLANO: Módulos de Frotas e Técnico de Campo

**Data**: 2026-06-18  
**Objetivo**: Criar dois módulos completos (Frotas + Técnico) seguindo padrão modular  
**Modelo**: Estrutura similar ao ferramental existente

---

## 🎯 FASES DO PROJETO

### FASE 1: Infraestrutura & Setup (This Turn)
- [ ] Criar estrutura de pastas modular
- [ ] Definir modelos de dados (DB schema)
- [ ] Criar API routes básicas
- [ ] Documentar estrutura

### FASE 2: Módulo de Frotas (Gestão)
- [ ] Dashboard de frotas (KPIs, gráficos)
- [ ] Tabela de veículos
- [ ] Painel de cadastro/edição
- [ ] Filtros e busca
- [ ] Integrações com backend

### FASE 3: Módulo de Técnico (Campo)
- [ ] Tela de login/autenticação
- [ ] Dashboard técnico (stats, chamados)
- [ ] Registro de ponto
- [ ] Histórico de atendimentos
- [ ] Integração GPS (já existe)

### FASE 4: Finalização & Testes
- [ ] Integração completa
- [ ] Testes E2E
- [ ] Deploy

---

## 📁 ESTRUTURA DE PASTAS

```
app/
├── frotas/                      # Módulo de gestão de frotas
│   ├── page.js                 # Dashboard principal
│   ├── dashboard/
│   │   └── page.js            # Painel geral
│   ├── veiculos/
│   │   ├── page.js            # Listagem de veículos
│   │   ├── novo/page.js       # Cadastro novo
│   │   └── [id]/
│   │       ├── page.js        # Detalhes/edição
│   │       └── historico.js   # Histórico do veículo
│   └── relatorios/
│       └── page.js            # Relatórios
│
├── tecnico/                     # Módulo de técnico de campo
│   ├── page.js                 # Login/home
│   ├── dashboard/
│   │   └── page.js            # Dashboard técnico
│   ├── chamados/
│   │   ├── page.js            # Lista de chamados
│   │   └── [id]/page.js       # Detalhes do chamado
│   ├── ponto/
│   │   └── page.js            # Registro de ponto
│   └── historico/
│       └── page.js            # Histórico de atendimentos
│
├── api/
│   ├── frotas/
│   │   ├── route.js           # GET/POST veículos
│   │   ├── [id]/route.js      # GET/PUT/DELETE um veículo
│   │   └── relatorios/route.js
│   │
│   └── tecnico/
│       ├── chamados/route.js
│       ├── ponto/route.js
│       └── atendimentos/route.js
│
└── (outros módulos existentes)

lib/
├── db.js                       # Conexão banco de dados
├── models/
│   ├── frota.js               # Schema de frotas
│   ├── tecnico.js             # Schema de técnicos
│   ├── chamado.js             # Schema de chamados
│   └── ponto.js               # Schema de ponto
└── utils/
    ├── auth.js                # Autenticação
    └── validations.js         # Validações

components/
├── frotas/
│   ├── FrotaHeader.js
│   ├── VeiculoCard.js
│   ├── VeiculoTable.js
│   ├── FrotaStats.js
│   └── FrotaChart.js
│
└── tecnico/
    ├── TecnicoHeader.js
    ├── ChamadoCard.js
    ├── PontoForm.js
    └── TecnicoStats.js
```

---

## 📊 MODELOS DE DADOS

### Tabela: Frotas (Veículos)
```javascript
{
  id: UUID,
  placa: String (unique),
  modelo: String,
  ano: Number,
  marca: String,
  kmAtual: Number,
  status: 'Ativo' | 'Parado' | 'Manutenção' | 'Descartado',
  tecnicoAssignado: UUID (ref Tecnico),
  ultimaManutencao: Date,
  proximaManutencao: Date,
  combustivel: Number (litros),
  observacoes: Text,
  createdAt: Date,
  updatedAt: Date,
  deletedAt: Date | null
}
```

### Tabela: Técnicos
```javascript
{
  id: UUID,
  matricula: String (unique),
  nome: String,
  email: String,
  telefone: String,
  atp: String (Assistência Técnica),
  status: 'Ativo' | 'Inativo' | 'Afastado',
  frota: UUID (ref Frota),
  createdAt: Date,
  updatedAt: Date
}
```

### Tabela: Chamados
```javascript
{
  id: UUID,
  numero: String (unique),
  tecnicoId: UUID (ref Tecnico),
  frotagId: UUID (ref Frota),
  statusChamado: 'Aberto' | 'Em Atendimento' | 'Pausado' | 'Finalizado',
  dataAbertura: Date,
  dataFechamento: Date | null,
  descricao: Text,
  observacaoFinal: Text,
  createdAt: Date,
  updatedAt: Date
}
```

### Tabela: Ponto
```javascript
{
  id: UUID,
  tecnicoId: UUID (ref Tecnico),
  data: Date,
  tipo: 'ENTRADA' | 'SAÍDA',
  hora: Time,
  latitude: Float | null,
  longitude: Float | null,
  status: 'Registrado' | 'Ajuste Pendente' | 'Ajustado',
  createdAt: Date
}
```

---

## 🔌 APIS PRINCIPAIS

### Frotas
- `GET /api/frotas` - Listar veículos (com paginação, filtros)
- `POST /api/frotas` - Criar novo veículo
- `GET /api/frotas/[id]` - Detalhes do veículo
- `PUT /api/frotas/[id]` - Atualizar veículo
- `DELETE /api/frotas/[id]` - Deletar veículo
- `GET /api/frotas/relatorios/dashboard` - KPIs

### Técnico
- `GET /api/tecnico/chamados` - Listar chamados do técnico
- `POST /api/tecnico/chamados/[id]/checkin` - Check-in em chamado
- `POST /api/tecnico/chamados/[id]/checkout` - Check-out em chamado
- `POST /api/tecnico/ponto` - Registrar ponto
- `GET /api/tecnico/atendimentos` - Histórico de atendimentos

---

## 🎨 DESIGN SYSTEM

**Referência**: Já capturado em TEMPLATE_TECNICO_CAMPO.md

**Colors (CSS Variables)**:
- Primary: `#0369a1` (azul)
- Success: `#059669` (verde)
- Warning: `#d97706` (laranja)
- Danger: `#dc2626` (vermelho)

**Fonts**:
- Header: Plus Jakarta Sans (800)
- Body: Plus Jakarta Sans (400-600)
- Code/Mono: JetBrains Mono (400-500)

**Components**: 
- Cards, Badges, Buttons, Tables, Forms (já documentados)

---

## ✅ CHECKLIST DE EXECUÇÃO

### Infraestrutura
- [ ] Criar pastas `/api/frotas` e `/api/tecnico`
- [ ] Criar arquivos `lib/models/*`
- [ ] Configurar banco de dados
- [ ] Criar componentes base

### Módulo Frotas
- [ ] Dashboard com KPIs
- [ ] Listagem de veículos
- [ ] CRUD de veículos
- [ ] Relatórios

### Módulo Técnico
- [ ] Login de técnico
- [ ] Dashboard (stats + chamados)
- [ ] Registro de ponto
- [ ] Histórico

### Finalização
- [ ] Integração completa
- [ ] Testes
- [ ] Deploy

---

## 📝 NOTAS

1. **Padrão de código**: Seguir o padrão de `ferramental/solicitar/page.js`
2. **Autenticação**: Usar Firebase (já existe no projeto)
3. **Styling**: Inline styles (como no ferramental) ou CSS modules
4. **Validações**: Criar helper em `lib/utils/validations.js`

---


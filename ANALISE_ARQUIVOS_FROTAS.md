# 📋 Análise: Diferença entre index.html (Frotas) e tec.html (Técnico)

## 🏢 **index.html** - PAINEL ADMINISTRATIVO DE FROTAS (10.248 linhas | 651KB)

### Estrutura Geral
- **Tipo:** Aplicação desktop com Sidebar + Topbar
- **Público:** Administradores e gerentes
- **Foco:** Gerenciamento operacional centralizado
- **Design:** Sidebar lateral (260px fixo) + Topbar + Conteúdo principal

### Seções Principais (Navegação)

#### 1. **SLA** (Seção)
- Painel SLA
- Alertas SLA (com badges de contagem)

#### 2. **Visão Geral** (Dashboard)
- Dashboard principal com KPIs
- Métricas: Total Técnicos, Técnicos Ativos, ATPs Ativas, Estoque

#### 3. **Cadastros**
- **ATPs** (Assistências Técnicas) - locais onde técnicos atuam
- **Técnicos** - cadastro e gestão
- **Férias** - agenda de férias (com badges de urgência)

#### 4. **Backlog**
- Painel Geral (dashboard)
- Chamados (com badges de atrasados)
- Solicitações de Peças (PP)
- Importar Base

#### 5. **Gestão de Técnicos** ⭐ (O MAIS PRÓXIMO DE FROTAS)
- **Dashboard TEC** - visão resumida
- **Mapa de Campo** - localização em tempo real
- **Atendimentos** - chamados e serviços
- **Controle de Ponto** - registro de ponto
- **Incidentes** - ocorrências
- **Avisos** - comunicados

#### 6. **Administrativo**
- **Veículos** ⭐ (FROTAS - Gerenciamento de frota)
  - Placa do veículo
  - Status do veículo
  - Atribuição a técnicos
  - Histórico
- **Relatórios**
- Usuários Admin

#### 7. **Ferramentas**
- **Estoque** - inventário de ferramentas
- **Kits & Vínculos** - vincular ferramentas

#### 8. **PPCR**
- Solicitações de peças

### Componentes de UI Destacados
- **KPI Cards** - 4 colunas com cores (blue, green, amber, purple)
- **Tabelas** com paginação
- **Charts.js** - gráficos de dados
- **Leaflet Maps** - mapa interativo
- **Badges** - status coloridos
- **Modais** - para ações complexas
- **Timeline** - histórico de eventos
- **Notificações** - painel superior direito

### Dados de Negócio
- Regiões: TODOS, SUL, NORTE, NORDESTE, SUDESTE, C-OESTE
- Status: Ativo, Inativo
- Cores padrão: Azul (#0369a1), Verde (#059669), Laranja (#d97706), Vermelho (#dc2626)

---

## 📱 **tec.html** - PAINEL TÉCNICO DE CAMPO (2.823 linhas | 170KB)

### Estrutura Geral
- **Tipo:** Aplicação mobile/PWA (Progressive Web App)
- **Público:** Técnicos em campo
- **Foco:** Operações rápidas, uso offline, GPS
- **Design:** Header sticky + Conteúdo full-width max 500px

### Seções Principais (Fluxo)

#### 1. **Login**
- Tela de login simples com matrícula + senha
- Opção de nova senha (se temporária)

#### 2. **Home/Dashboard** (Após login)
- **Stats Row** (3 colunas):
  - ATP (Assistência Técnica) - card principal azul
  - Hoje - chamados do dia
  - Mês - chamados do mês + TMA (Tempo Médio de Atendimento)

#### 3. **Veículo Atual**
- Card com gradiente mostrando placa do veículo
- Detalhes do veículo
- Status

#### 4. **Chamado Ativo**
- Card com destaque verde (ativo)
- Número do chamado
- Timer de atendimento
- Meta de check-in

#### 5. **Controle de Ponto**
- Registro de entrada/saída
- Pills: Done (verde) / Pending (cinza)
- Timestamps

#### 6. **Registros**
- Histórico de ações do dia
- Tipo de registro (Ex: "Check-in", "Conclusão", "Pausa")
- Horário monofônico

#### 7. **Avisos**
- Cards com tipos de alertas
- Descrição curta
- Data/hora

#### 8. **Solicitações**
- Items em lista
- Status de aprovação

#### 9. **Backlog**
- Lista de chamados próximos
- Priorização visual

### Componentes de UI Destacados
- **Stats Cards** - 3 colunas (compactas)
- **Gradient Bars** - para destaque (veículo, chamado ativo)
- **Badges** - verde/amarelo/vermelho
- **Tables** - simples, monofônicas
- **Modal de confirmação** - bottom-sheet
- **Abastecimento Modal** - slide-up
- **GPS Block** - requisição de localização
- **Paginação** - simples

### Dados de Negócio
- ATP: Código + Cidade (Ex: "ATP001" - São Paulo)
- Chamado: Número + Status
- Ponto: Entrada/Saída/Pausa
- Veículo: Placa em monofônica grande

---

## 🎨 COMPARAÇÃO DE DESIGN SYSTEM

| Aspecto | index.html | tec.html |
|---------|-----------|----------|
| **Layout** | Sidebar 260px + Topbar | Header sticky |
| **Max Width** | Full | 500px (mobile-first) |
| **Tabelas** | Grandes, detalhadas | Compactas |
| **Cards** | 4 colunas KPI | 3 colunas stats |
| **Fonts** | Plus Jakarta Sans | Plus Jakarta Sans |
| **Monofônica** | JetBrains Mono | JetBrains Mono |
| **Cores** | 5 cores (#0369a1, #0ea5e9, #059669, #d97706, #dc2626) | Mesmas cores |
| **Tema** | Light/Dark com CSS Vars | Light/Dark com CSS Vars |
| **Mobile** | Não otimizado | PWA otimizado |
| **GPS** | Não | Sim (obrigatório) |
| **Maps** | Leaflet (painel admin) | Não |

---

## ⭐ MÓDULO DE FROTAS (O QUE VOCÊ QUER)

### No index.html, a seção **"Administrativo > Veículos"** é focada em:

```
📊 Dashboard de Veículos
├── Grid de KPIs
│   ├── Total de Veículos
│   ├── Veículos Ativos
│   ├── Veículos em Manutenção
│   └── Taxa de Utilização
├── Tabela de Veículos
│   ├── Placa (Monofônica)
│   ├── Modelo
│   ├── Motorista/Técnico Atribuído
│   ├── Status (Ativo/Parado/Manutenção)
│   ├── Km
│   ├── Última Manutenção
│   └── Ações (Editar, Visualizar)
├── Mapa com Frotas
│   └── Localização em tempo real (Leaflet)
├── Histórico de Movimento
│   └── Saídas/Entradas/Paradas
└── Filtros
    └── Por Região, Status, Técnico

```

---

## 💡 RECOMENDAÇÃO PARA VOCÊ

### Para criar um módulo de Técnico de Campo no seu portal onsite, use **tec.html** como base:

✅ **Copiar de tec.html:**
- Estrutura de Header sticky
- Stats Row (3 colunas)
- Cards com gradientes
- Modal de confirmação
- Badges de status
- Sistema de ponto
- Avisos

❌ **NÃO copiar:**
- Sidebar (é apenas para admin)
- Mapas Leaflet (use só no admin)

### Para expandir com Frotas:
- Adicione seção "Veículos Atribuídos" no tec.html
- Mostre placa, modelo, km
- Botão para histórico de movimento
- GPS atual do veículo (já existe no tec.html)


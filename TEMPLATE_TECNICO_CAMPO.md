# 🎨 TEMPLATE: Interface Técnico de Campo

## Estrutura Base (tec.html)

Este documento mostra como estruturar um módulo de Técnico de Campo baseado no `tec.html`.

---

## 📱 LAYOUT RESPONSIVO

```
┌─────────────────────────────────┐
│ HEADER (Sticky)                 │
│ Logo | Usuário | Tema | Logout  │
├─────────────────────────────────┤
│                                 │
│ MAIN (max-width: 500px)         │
│ ├─ Stats Row (3 colunas)        │
│ ├─ Veículo Bar (gradiente)      │
│ ├─ Chamado Ativo (destaque)     │
│ ├─ Cards (Ponto, Chamado, etc)  │
│ └─ Tabelas e Históricos         │
│                                 │
└─────────────────────────────────┘
```

---

## 🎯 COMPONENTES PRINCIPAIS

### 1️⃣ Header (Sticky)
```html
<div class="header">
  <div class="header-left">
    <div class="logo-icon"><!-- SVG --></div>
    <span class="logo-text">Ener<span>Fine</span></span>
  </div>
  <div class="header-right">
    <div class="user-chip">
      <div class="user-avatar">AD</div>
      <span class="user-name">Admin</span>
    </div>
    <button class="theme-btn" onclick="toggleTheme()">🌙</button>
    <button class="logout-btn" onclick="fazerLogout()">Sair</button>
  </div>
</div>
```

**Características:**
- Posição sticky (fica no topo)
- Dark header (#0f172a em light mode)
- Avatar circular com iniciais
- Botão de tema e logout

---

### 2️⃣ Stats Row (3 Colunas)
```html
<div class="stats-row">
  <div class="stat-card">
    <div class="stat-label">ATP</div>
    <div class="stat-atp-txt">Código + Cidade</div>
  </div>
  <div class="stat-card sec">
    <div class="stat-label">Hoje</div>
    <div class="stat-value">0</div>
    <div class="stat-sub">chamados</div>
  </div>
  <div class="stat-card sec">
    <div class="stat-label">Mês</div>
    <div class="stat-value">0</div>
    <div class="stat-sub">TMA: —</div>
  </div>
</div>
```

**CSS:**
```css
.stats-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
  margin-bottom: 16px;
}

.stat-card {
  background: var(--accent);
  border-radius: 12px;
  padding: 12px 10px;
  color: #fff;
}

.stat-card.sec {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
}

.stat-value {
  font-size: 20px;
  font-weight: 800;
  font-family: 'JetBrains Mono', monospace;
}
```

---

### 3️⃣ Veículo Bar (Gradiente)
```html
<div class="veiculo-bar">
  <svg width="22" height="22">🚗</svg>
  <div style="flex:1;">
    <div class="veiculo-placa">ABC-1234</div>
    <div class="veiculo-detalhe">Modelo XYZ · 2022</div>
  </div>
</div>
```

**CSS:**
```css
.veiculo-bar {
  background: linear-gradient(135deg, var(--accent), #0284c7);
  border-radius: 12px;
  padding: 14px 16px;
  color: #fff;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.veiculo-placa {
  font-family: 'JetBrains Mono', monospace;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: 1px;
}
```

---

### 4️⃣ Chamado Ativo (Destaque)
```html
<div class="chamado-ativo-wrap">
  <div style="display:flex;justify-content:space-between;align-items:center;">
    <div class="chamado-ativo-label">Em Atendimento</div>
    <span class="badge badge-green">Ativo</span>
  </div>
  <div class="chamado-ativo-num">50014582863</div>
  <div class="chamado-timer">00:45:30</div>
  <div class="chamado-checkin-meta">Check-in: 10:30</div>
  <div class="btn-row">
    <button class="btn btn-warning">Pausar</button>
    <button class="btn btn-danger-s">Finalizar</button>
  </div>
</div>
```

**CSS:**
```css
.chamado-ativo-wrap {
  background: linear-gradient(135deg, rgba(5,150,105,.12), rgba(5,150,105,.05));
  border: 1.5px solid rgba(5,150,105,.3);
  border-radius: 14px;
  padding: 18px;
  margin-bottom: 16px;
}

.chamado-ativo-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 20px;
  font-weight: 800;
  color: var(--success);
}

.chamado-timer {
  font-size: 32px;
  font-weight: 800;
  margin: 6px 0 2px;
}
```

---

### 5️⃣ Card Padrão
```html
<div class="card">
  <div class="card-title">
    <svg width="15" height="15">📋</svg>
    Título do Card
  </div>
  <!-- Conteúdo -->
</div>
```

**CSS:**
```css
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: var(--shadow);
}

.card-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 16px;
}
```

---

### 6️⃣ Registro de Ponto
```html
<div class="card">
  <div class="card-title">📅 Registro de Ponto</div>
  
  <div class="ponto-status-bar">
    <div class="ponto-pill done">Entrada: 08:30</div>
    <div class="ponto-pill pending">Saída: pendente</div>
  </div>
  
  <div class="btn-row">
    <button class="btn btn-success">Entrada</button>
    <button class="btn btn-neutral" disabled>Saída</button>
  </div>
</div>
```

**CSS:**
```css
.ponto-status-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}

.ponto-pill {
  flex: 1;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
  border: 1.5px solid var(--border);
  background: var(--surface2);
  color: var(--text3);
}

.ponto-pill.done {
  background: rgba(5,150,105,.08);
  color: var(--success);
  border-color: rgba(5,150,105,.25);
}
```

---

### 7️⃣ Tabela Compacta
```html
<div class="card">
  <div class="card-title">📞 Histórico</div>
  
  <div class="search-wrap">
    <svg width="13" height="13">🔍</svg>
    <input type="text" placeholder="Filtrar…">
  </div>
  
  <div style="overflow-x:auto;">
    <table>
      <thead>
        <tr>
          <th>Chamado</th>
          <th>Check-in</th>
          <th>Duração</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="mono">50014582863</td>
          <td>10:30</td>
          <td>45min</td>
        </tr>
      </tbody>
    </table>
  </div>
  
  <div class="pagination">
    <button class="page-btn">1</button>
    <button class="page-btn active">2</button>
  </div>
</div>
```

**CSS:**
```css
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

thead th {
  padding: 8px 10px;
  text-align: left;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--text3);
  border-bottom: 1px solid var(--border);
}

tbody td {
  padding: 10px;
  border-bottom: 1px solid var(--border);
  color: var(--text2);
  vertical-align: middle;
}

.mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
}
```

---

### 8️⃣ Badges de Status
```html
<span class="badge badge-green">✓ Ativo</span>
<span class="badge badge-amber">⚠ Pendente</span>
<span class="badge badge-red">✗ Erro</span>
<span class="badge badge-blue">ℹ Informação</span>
```

**CSS:**
```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
}

.badge::before {
  content: '';
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}

.badge-green {
  background: rgba(5,150,105,.1);
  color: var(--success);
}

.badge-green::before {
  background: var(--success);
}

.badge-amber {
  background: rgba(217,119,6,.1);
  color: var(--warning);
}

.badge-amber::before {
  background: var(--warning);
}
```

---

### 9️⃣ Botões
```html
<button class="btn btn-primary">Ação Principal</button>
<button class="btn btn-success">Confirmar</button>
<button class="btn btn-warning">Aviso</button>
<button class="btn btn-danger-s">Perigo</button>
<button class="btn btn-neutral">Neutro</button>

<div class="btn-row">
  <button class="btn btn-success">OK</button>
  <button class="btn btn-neutral">Cancelar</button>
</div>
```

**CSS:**
```css
.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  transition: all .15s;
}

.btn-primary {
  background: var(--accent);
  color: #fff;
}

.btn-primary:hover {
  filter: brightness(1.1);
}

.btn-success {
  background: var(--success);
  color: #fff;
}

.btn-warning {
  background: var(--warning);
  color: #fff;
}

.btn-danger-s {
  background: rgba(220,38,38,.1);
  color: var(--danger);
  border: 1px solid rgba(220,38,38,.2);
}

.btn-neutral {
  background: var(--surface2);
  color: var(--text2);
  border: 1px solid var(--border);
}

.btn-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
```

---

## 🎨 THEME SYSTEM (CSS Variables)

```css
[data-theme="light"] {
  --bg: #f0f4f8;
  --surface: #fff;
  --surface2: #f5f7fa;
  --border: rgba(0,0,0,0.08);
  --accent: #0369a1;
  --accent2: #0ea5e9;
  --accent-glow: rgba(3,105,161,0.12);
  --success: #059669;
  --warning: #d97706;
  --danger: #dc2626;
  --text: #0f172a;
  --text2: #475569;
  --text3: #94a3b8;
  --shadow: 0 1px 4px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.05);
  --header-bg: #0f172a;
}

[data-theme="dark"] {
  --bg: #080d14;
  --surface: #0e1620;
  --surface2: #141e2d;
  --border: rgba(255,255,255,0.07);
  --accent: #0ea5e9;
  --accent2: #38bdf8;
  --accent-glow: rgba(14,165,233,0.18);
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
  --text: #f0f6ff;
  --text2: #8ba3c0;
  --text3: #4d6480;
  --shadow: none;
  --header-bg: #070c12;
}
```

---

## 📝 FORM INPUTS

```html
<div class="form-group">
  <label class="form-label">Label</label>
  <input type="text" placeholder="Placeholder">
</div>

<div class="form-group">
  <label class="form-label">Select</label>
  <select>
    <option>Opção 1</option>
    <option>Opção 2</option>
  </select>
</div>
```

**CSS:**
```css
.form-group {
  margin-bottom: 12px;
}

.form-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .8px;
  text-transform: uppercase;
  color: var(--text3);
  display: block;
  margin-bottom: 5px;
}

input, select, textarea {
  width: 100%;
  padding: 11px 14px;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 9px;
  color: var(--text);
  font-family: inherit;
  font-size: 14px;
  outline: none;
  transition: border-color .15s;
}

input:focus, select:focus, textarea:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

input::placeholder {
  color: var(--text3);
}
```

---

## 🎯 COMO USAR COMO BASE

1. **Copie a estrutura base** do Header + Main (max-width 500px)
2. **Use os componentes** card, stats-row, badges, buttons conforme necessário
3. **Mantenha o theme system** para suportar light/dark
4. **Adapte cores** conforme sua marca (default: azul #0369a1)
5. **Mobile-first:** sempre 500px max-width, depois responsive

---

## 💾 ARQUIVOS REFERÊNCIA

- `tec.html`: Implementação completa (2.823 linhas)
- `index.html`: Admin dashboard (10.248 linhas) - para reference de componentes maiores


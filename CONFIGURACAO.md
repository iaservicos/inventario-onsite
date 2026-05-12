# Inventário Onsite — Guia de Configuração

## Pré-requisitos

- Node.js 18+ instalado
- Conta no [Supabase](https://supabase.com) (gratuita)
- Conta no [Vercel](https://vercel.com) (gratuita)
- Conta no [GitHub](https://github.com)

---

## 1. Configurar o Supabase

### 1.1 Criar o projeto

1. Acesse [supabase.com](https://supabase.com) e clique em **New Project**
2. Escolha um nome (ex: `inventario-onsite`) e defina uma senha forte para o banco
3. Aguarde o projeto ser criado (cerca de 1 minuto)

### 1.2 Criar as tabelas

1. No painel do Supabase, vá em **SQL Editor**
2. Clique em **New Query**
3. Cole todo o conteúdo do arquivo `supabase/schema.sql`
4. Clique em **Run** (ou pressione `Ctrl+Enter`)

Isso criará todas as tabelas, índices e o usuário administrador padrão.

### 1.3 Obter as credenciais

1. Vá em **Settings → API**
2. Copie os seguintes valores:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY` *(mantenha em segredo)*

---

## 2. Configurar variáveis de ambiente

### Para desenvolvimento local

Crie o arquivo `.env.local` na raiz do projeto com o conteúdo abaixo:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXTAUTH_SECRET=uma-chave-aleatoria-de-32-caracteres
NEXTAUTH_URL=http://localhost:3000
```

> **NEXTAUTH_SECRET**: gere uma chave aleatória com o comando:
> ```bash
> openssl rand -base64 32
> ```

### Para produção (Vercel)

As mesmas variáveis devem ser adicionadas no painel do Vercel em **Settings → Environment Variables**, exceto que `NEXTAUTH_URL` deve ser a URL de produção (ex: `https://inventario-onsite.vercel.app`).

---

## 3. Rodar localmente

```bash
# Instalar dependências
npm install

# Iniciar o servidor de desenvolvimento
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

**Login padrão:**
- E-mail: `admin@inventarioonsite.com.br`
- Senha: `Admin@2025`

> Altere a senha imediatamente após o primeiro login criando um novo usuário administrador.

---

## 4. Deploy no Vercel

### 4.1 Subir o código para o GitHub

```bash
git init
git add .
git commit -m "feat: inventário onsite dashboard"
git branch -M main
git remote add origin https://github.com/seu-usuario/inventario-onsite.git
git push -u origin main
```

### 4.2 Conectar ao Vercel

1. Acesse [vercel.com](https://vercel.com) e clique em **Add New Project**
2. Importe o repositório do GitHub
3. Na seção **Environment Variables**, adicione todas as variáveis do `.env.local` (com `NEXTAUTH_URL` apontando para a URL do Vercel)
4. Clique em **Deploy**

O Vercel detecta automaticamente que é um projeto Next.js e configura o build.

---

## 5. Carregar dados de demonstração

Após o deploy, acesse a tela de **Simulação** e clique em **Carregar Dados Demo**. Isso populará o banco com técnicos, inventários, alertas, divergências e logs de exemplo.

---

## 6. Estrutura de pastas

```
inventario-onsite/
├── app/
│   ├── (auth)/login/         → Tela de login
│   ├── (dashboard)/
│   │   ├── layout.js         → Layout com sidebar e proteção de rota
│   │   ├── dashboard/        → Dashboard principal com KPIs
│   │   ├── tecnicos/         → Tabela de técnicos + exportação Excel
│   │   ├── alertas/          → Painel de alertas com escalonamento
│   │   ├── divergencias/     → Comparativo físico vs sistema
│   │   ├── logs/             → Log centralizado de eventos
│   │   ├── simulacao/        → Simulação do fluxo completo
│   │   └── usuarios/         → Gerenciamento de usuários (admin)
│   ├── api/
│   │   ├── auth/[...nextauth]/ → Autenticação NextAuth
│   │   ├── dashboard/        → KPIs e dados do dashboard
│   │   ├── inventories/      → CRUD de inventários
│   │   ├── technicians/      → CRUD de técnicos
│   │   ├── alerts/           → Alertas e resolução
│   │   ├── divergences/      → Divergências e atualização de status
│   │   ├── logs/             → Logs de fluxo
│   │   ├── users/            → Gerenciamento de usuários
│   │   └── seed/             → Dados de demonstração
│   ├── globals.css           → Tema dark navy + classes utilitárias
│   ├── layout.js             → Layout raiz
│   └── providers.js          → SessionProvider + Toaster
├── components/
│   ├── layout/Sidebar.js     → Navegação lateral
│   └── ui/
│       ├── FilterBar.js      → Filtros reutilizáveis
│       ├── PageHeader.js     → Cabeçalho de página
│       └── StatusBadge.js    → Badge de status colorido
├── lib/
│   ├── db.js                 → Queries do Supabase
│   ├── supabase.js           → Cliente Supabase
│   └── utils.js              → Utilitários e formatadores
├── supabase/
│   ├── schema.sql            → Schema completo do banco
│   └── seed.sql              → Dados de demonstração (SQL)
├── jsconfig.json             → Path aliases (@/...)
├── next.config.js
├── tailwind.config.js
└── .env.example              → Modelo de variáveis de ambiente
```

---

## 7. Perfis de acesso

| Perfil | Acesso |
|---|---|
| **Administrador** | Todas as telas, incluindo gerenciamento de usuários |
| **Supervisor** | Dashboard, Técnicos, Alertas, Divergências, Logs, Simulação |
| **Coordenador** | Dashboard, Técnicos, Alertas, Divergências, Logs, Simulação |

---

## 8. Integrações de referência

O dashboard monitora a saúde de duas integrações:

- **Power Automate** — dispara inventários, detecta divergências e gera alertas
- **Dispara.AI** — envia mensagens WhatsApp aos técnicos e coleta respostas

Os indicadores de saúde (status, tempo de resposta, uptime) são atualizados via a tabela `integration_health` no Supabase.

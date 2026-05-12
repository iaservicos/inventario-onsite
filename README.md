# Inventário Onsite — Dashboard de Monitoramento

Dashboard de supervisão para o fluxo de inventário cíclico de técnicos, integrando **Power Automate** e **Dispara.AI**.

## Stack

- **Next.js 14** (App Router) + JavaScript
- **Supabase** (PostgreSQL)
- **NextAuth.js** (autenticação com e-mail/senha)
- **Tailwind CSS** + tema dark navy customizado
- **Recharts** (gráficos)
- **xlsx** (exportação Excel)
- **Vercel** (deploy)

## Telas

| Tela | Descrição |
|---|---|
| Login | Autenticação por e-mail e senha |
| Dashboard | KPIs, gráfico de distribuição, saúde das integrações |
| Técnicos | Desempenho por técnico, exportação Excel |
| Alertas | Abandonos e recontagens com escalonamento visual |
| Divergências | Comparativo físico vs sistema, exportação Excel |
| Logs | Registro centralizado de eventos do fluxo |
| Usuários | Gerenciamento de acesso (somente admin) |

## Configuração

Consulte o arquivo **CONFIGURACAO.md** para instruções completas de setup, variáveis de ambiente e deploy.

## Login padrão

- E-mail: `admin@inventarioonsite.com.br`
- Senha: `Admin@2025`

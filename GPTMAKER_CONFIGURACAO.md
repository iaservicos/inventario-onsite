# Configuração do GPT Maker — Inventário Cíclico via WhatsApp

## Visão Geral

O fluxo substitui o Dispara.AI e o Power Automate por um agente de IA no WhatsApp que conduz o técnico peça a peça, sem limite de itens, sem intervenção manual. O supervisor agenda no dashboard, o sistema dispara automaticamente e o agente registra tudo no banco de dados em tempo real.

---

## 1. Variáveis de Ambiente no Vercel

Adicione as seguintes variáveis no painel do Vercel (Settings → Environment Variables):

| Variável | Descrição | Exemplo |
|---|---|---|
| `GPTMAKER_WEBHOOK_SECRET` | Token secreto para validar chamadas do GPT Maker | `inv_secret_abc123` |
| `DISPATCH_SECRET` | Token para proteger o endpoint de disparo | `dispatch_xyz789` |

As variáveis do Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) já estão configuradas.

---

## 2. Schema do Banco de Dados

Execute o arquivo `supabase/schema_gptmaker.sql` no SQL Editor do Supabase. Ele cria:

- `technician_items` — portfólio de peças de cada técnico
- `inventory_schedules` — agendamentos criados pelo supervisor
- `gptmaker_sessions` — sessões de conversa ativas no WhatsApp

---

## 3. Configuração do Agente no GPT Maker

### 3.1 Criar o Agente

No GPT Maker, crie um novo agente com as seguintes configurações:

**Nome:** Inventário Onsite
**Canal:** WhatsApp (conecte o número dedicado ao inventário)
**Modo:** Webhook (o agente repassa todas as mensagens para a sua API)

### 3.2 Prompt do Sistema

Cole o seguinte prompt no campo "Instruções do Sistema" do agente:

```
Você é o assistente de inventário da equipe técnica. Sua única função é conduzir o técnico na contagem de peças do inventário semanal.

Regras:
- Aceite apenas números como resposta. Se o técnico enviar texto, peça gentilmente que informe apenas o número.
- Não responda perguntas fora do contexto do inventário.
- Se o técnico disser "cancelar", "parar" ou "sair", informe que o inventário foi pausado e que o supervisor será notificado.
- Seja direto e cordial. Use o nome do técnico quando disponível.
- Não invente quantidades. Registre exatamente o que o técnico informar.
```

### 3.3 Configuração do Webhook

No GPT Maker, configure o webhook de saída (onde o agente envia as respostas do usuário):

**URL:** `https://SEU-DOMINIO.vercel.app/api/webhook/gptmaker`
**Método:** POST
**Headers:**
```
Content-Type: application/json
```

**Payload enviado pelo GPT Maker (configure no mapeamento):**
```json
{
  "phone": "{{contact.phone}}",
  "message": "{{message.text}}",
  "session_token": "{{contact.custom_field_session_token}}"
}
```

> O campo `session_token` deve ser salvo como campo personalizado do contato no GPT Maker quando o inventário for disparado.

### 3.4 Fluxo de Disparo (Primeiro Contato)

Quando o sistema disparar o inventário via `/api/webhook/dispatch`, o endpoint retorna:

```json
{
  "ok": true,
  "results": [{
    "phone": "5511999999999",
    "session_token": "abc123...",
    "first_message": "Olá, João! Chegou a hora do seu inventário..."
  }]
}
```

Use o Power Automate para:
1. Chamar `POST /api/webhook/dispatch` com o `schedule_id`
2. Pegar o `first_message` e o `phone` do resultado
3. Enviar a `first_message` para o técnico via GPT Maker API
4. Salvar o `session_token` no campo personalizado do contato no GPT Maker

**Chamada para enviar mensagem via GPT Maker API:**
```
POST https://api.gptmaker.ai/v2/send-message
Authorization: Bearer SEU_TOKEN_GPTMAKER
Content-Type: application/json

{
  "phone": "5511999999999",
  "message": "Olá, João! Chegou a hora do seu inventário...",
  "custom_fields": {
    "session_token": "abc123..."
  }
}
```

---

## 4. Fluxo Completo — Passo a Passo

```
Supervisor cria agendamento no dashboard
        ↓
Sistema aguarda data/hora programada
        ↓
Power Automate chama POST /api/webhook/dispatch
        ↓
Sistema seleciona N peças do técnico, cria inventário e sessão
        ↓
Retorna first_message + session_token
        ↓
Power Automate envia mensagem via GPT Maker API
        ↓
Técnico responde no WhatsApp
        ↓
GPT Maker chama POST /api/webhook/gptmaker com a resposta
        ↓
Sistema registra contagem, avança para próxima peça
        ↓
[Repete até última peça]
        ↓
Sistema finaliza inventário:
  - Sem divergências → status "completed"
  - Com divergências → status "recount_pending" + alerta criado
        ↓
Dashboard atualiza em tempo real
```

---

## 5. Recontagem das Mesmas Peças

Quando o inventário finaliza com divergências, o status muda para `recount_pending`. Para disparar a recontagem:

1. No dashboard → Divergências, o supervisor vê as peças com problema
2. Cria um novo agendamento para o mesmo técnico com a semana atual
3. O sistema, ao disparar, identifica as peças com `status = 'recount'` na tabela `inventory_items` e as prioriza na seleção

Para forçar recontagem apenas das peças divergentes, use a API:

```
POST /api/webhook/dispatch
x-dispatch-secret: SEU_DISPATCH_SECRET

{
  "schedule_id": 42
}
```

---

## 6. Detecção de Abandono

O sistema detecta abandono quando uma sessão fica sem resposta por mais de 4 horas. Para ativar a verificação automática, configure um cron no Power Automate ou Vercel Cron:

**Endpoint:** `GET /api/webhook/check-abandoned`
**Frequência:** A cada 30 minutos

O endpoint verifica sessões inativas, cria alertas no dashboard e pode renotificar o técnico via GPT Maker.

---

## 7. Testando o Fluxo

**Teste manual do disparo:**
```bash
curl -X POST https://SEU-DOMINIO.vercel.app/api/webhook/dispatch \
  -H "Content-Type: application/json" \
  -H "x-dispatch-secret: SEU_DISPATCH_SECRET" \
  -d '{"schedule_id": 1}'
```

**Teste manual de resposta do técnico:**
```bash
curl -X POST https://SEU-DOMINIO.vercel.app/api/webhook/gptmaker \
  -H "Content-Type: application/json" \
  -d '{"phone": "5511999999999", "message": "5", "session_token": "TOKEN_DA_SESSAO"}'
```

---

## 8. Checklist de Implantação

- [ ] Aplicar `schema_gptmaker.sql` no Supabase
- [ ] Adicionar `GPTMAKER_WEBHOOK_SECRET` e `DISPATCH_SECRET` no Vercel
- [ ] Fazer commit e deploy do código
- [ ] Criar agente no GPT Maker com o prompt acima
- [ ] Configurar webhook do GPT Maker apontando para `/api/webhook/gptmaker`
- [ ] Cadastrar técnicos com telefone no dashboard
- [ ] Cadastrar peças de cada técnico em Peças → selecionar técnico
- [ ] Criar primeiro agendamento de teste
- [ ] Disparar manualmente via curl e verificar resposta
- [ ] Testar resposta do técnico via curl
- [ ] Verificar no dashboard se o inventário aparece atualizado

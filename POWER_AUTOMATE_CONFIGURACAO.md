# Guia de Configuração — Power Automate

Dois fluxos precisam ser criados no Power Automate para automatizar o inventário.

---

## Fluxo 1 — Alerta D-1 via Dispara.AI

**Objetivo:** Todo dia às 08h, verificar se há inventários agendados para amanhã e enviar aviso via Dispara.AI para cada técnico.

### Configuração

**Gatilho:** Recorrência
- Frequência: Dia
- Intervalo: 1
- Horário: 08:00 (fuso horário: America/Sao_Paulo)

**Ação 1 — HTTP (buscar agendamentos de amanhã):**
- Método: `GET`
- URI: `https://SEU-DOMINIO.vercel.app/api/schedules/tomorrow`
- Headers:
  ```
  x-dispatch-secret: SEU_DISPATCH_SECRET
  ```

**Ação 2 — Parse JSON:**
- Conteúdo: `@{body('HTTP')}`
- Schema:
  ```json
  {
    "type": "object",
    "properties": {
      "count": { "type": "integer" },
      "schedules": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "schedule_id": { "type": "string" },
            "technician_name": { "type": "string" },
            "technician_phone": { "type": "string" },
            "scheduled_date": { "type": "string" },
            "scheduled_time": { "type": "string" },
            "items_count": { "type": "integer" }
          }
        }
      }
    }
  }
  ```

**Ação 3 — Condição:**
- `@{body('Parse_JSON')?['count']}` é maior que `0`

**Se sim — Ação 4 — Aplicar a cada (loop):**
- Entrada: `@{body('Parse_JSON')?['schedules']}`

**Dentro do loop — Ação 5 — HTTP (Dispara.AI):**
- Método: `POST`
- URI: `https://api.dispara.ai/v1/messages` *(confirme a URL correta no painel do Dispara.AI)*
- Headers:
  ```
  Authorization: Bearer SEU_TOKEN_DISPARAAI
  Content-Type: application/json
  ```
- Body:
  ```json
  {
    "phone": "@{items('Aplicar_a_cada')?['technician_phone']}",
    "message": "Olá, @{first(split(items('Aplicar_a_cada')?['technician_name'], ' '))}! 📋\n\nAmanhã, *@{items('Aplicar_a_cada')?['scheduled_date']}* às *@{items('Aplicar_a_cada')?['scheduled_time']}*, você terá um inventário de *@{items('Aplicar_a_cada')?['items_count']} peças* para realizar.\n\nSepare um momento tranquilo para responder. Qualquer dúvida, fale com seu supervisor. 👍"
  }
  ```

---

## Fluxo 2 — Disparo do Inventário no Horário Agendado

**Objetivo:** A cada 5 minutos, verificar se há inventários para disparar agora e iniciar a conversa no GPT Maker.

### Configuração

**Gatilho:** Recorrência
- Frequência: Minuto
- Intervalo: 5

**Ação 1 — HTTP (buscar agendamentos para agora):**
- Método: `GET`
- URI: `https://SEU-DOMINIO.vercel.app/api/schedules/now`
- Headers:
  ```
  x-dispatch-secret: SEU_DISPATCH_SECRET
  ```

**Ação 2 — Parse JSON** (mesmo schema do Fluxo 1)

**Ação 3 — Condição:**
- `@{body('Parse_JSON')?['count']}` é maior que `0`

**Se sim — Ação 4 — Aplicar a cada:**
- Entrada: `@{body('Parse_JSON')?['schedules']}`

**Dentro do loop — Ação 5 — HTTP (disparar inventário):**
- Método: `POST`
- URI: `https://SEU-DOMINIO.vercel.app/api/webhook/dispatch-databricks`
- Headers:
  ```
  x-dispatch-secret: SEU_DISPATCH_SECRET
  Content-Type: application/json
  ```
- Body:
  ```json
  {
    "schedule_id": "@{items('Aplicar_a_cada')?['schedule_id']}"
  }
  ```

---

## Fluxo 3 — Verificação de Abandono (opcional, mas recomendado)

**Objetivo:** A cada 30 minutos, verificar técnicos que pararam de responder.

**Gatilho:** Recorrência — a cada 30 minutos

**Ação 1 — HTTP:**
- Método: `GET`
- URI: `https://SEU-DOMINIO.vercel.app/api/webhook/check-abandoned`
- Headers:
  ```
  x-dispatch-secret: SEU_DISPATCH_SECRET
  ```

---

## Variáveis que você precisa substituir

| Placeholder | Onde encontrar |
|---|---|
| `SEU-DOMINIO.vercel.app` | URL do seu projeto no Vercel |
| `SEU_DISPATCH_SECRET` | Valor do `.env.local` (variável `DISPATCH_SECRET`) |
| `SEU_TOKEN_DISPARAAI` | Painel do Dispara.AI → Configurações → API Token |

---

## Observações importantes

- O Fluxo 2 usa o endpoint `/api/schedules/now` que ainda precisa ser criado — é similar ao `/tomorrow` mas filtra pelo horário atual (±5 minutos).
- Use **aspas simples** dentro de expressões dinâmicas do Power Automate, nunca aspas duplas.
- Teste cada fluxo manualmente antes de ativar a recorrência — use o botão "Executar" no Power Automate.

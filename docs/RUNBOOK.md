# Equilibrium — Runbook de Operações e Manutenção

Este documento detalha os procedimentos operacionais para administração, segurança, backup e diagnóstico de falhas do sistema **Equilibrium**.

---

## 1. 💾 Backup e Restauração da Base de Dados

O banco de dados PostgreSQL é hospedado no Supabase sob RLS rigoroso.

### Backup Automático (Dashboard Supabase)
1. Acesse o painel do Supabase: `https://supabase.com/dashboard/project/ueraistkgvdvxgsiwwhh`
2. Navegue até **Database → Backups**.
3. Baixe o snapshot diário ou agende restauração point-in-time (PITR).

### Backup Manual via CLI (`pg_dump`)
Execute com as credenciais de conexão do pooler:
```bash
pg_dump -h aws-0-sa-east-1.pooler.supabase.com -p 6543 -U postgres.ueraistkgvdvxgsiwwhh -d postgres -F c -b -v -f "equilibrium-backup-$(date +%Y%m%d).dump"
```

---

## 2. 🔑 Rotação de Chaves de API (OpenRouter)

Caso a chave da OpenRouter expire ou precise ser revogada:
1. Gere uma nova chave em [openrouter.ai/keys](https://openrouter.ai/keys).
2. Atualize localmente no arquivo `apps/web/.env.local`:
   ```env
   OPENROUTER_API_KEY=sk-or-v1-nova-chave...
   ```
3. Atualize em Produção na Vercel:
   * Acesse `Vercel Dashboard → equilibrium-app-web → Settings → Environment Variables`.
   * Edite a variável `OPENROUTER_API_KEY` e clique em **Save**.
   * Faça um **Redeploy** da última versão da branch `main`.

---

## 3. 👥 Convite Seguro de Parceiro(a)

O fluxo de integração do parceiro preserva o sigilo e vincula ao mesmo `household_id`:
1. No Header da aplicação web, clique no botão de **Convite** (ícone de envelope/usuário).
2. O sistema gera um token assinado de uso único persistido na tabela `invites`.
3. O parceiro acessa a URL: `https://equilibrium-app-web.vercel.app/convite/<token>`
4. Ao concluir o registro ou login, a trigger/action vincula o perfil do parceiro ao mesmo `household_id` com RLS ativo.

---

## 4. 📜 Auditoria do Assistente IA (`ai_action_logs`)

Todas as mutações propostas pelo Assistente passam por validação e log imutável:
* Toda ação acionada pelo chat gera um registro em `ai_action_logs` com os campos:
  * `household_id`, `user_id`, `tool_name`, `input_payload`, `status` (`proposed` → `executed` | `rejected`), `executed_at`.
* Para auditar ações executadas no Supabase SQL Editor:
  ```sql
  SELECT 
    l.created_at,
    p.full_name as usuario,
    l.tool_name,
    l.status,
    l.input_payload
  FROM ai_action_logs l
  JOIN profiles p ON p.id = l.user_id
  ORDER BY l.created_at DESC
  LIMIT 50;
  ```

---

## 5. ⚠️ Mitigação de Erros 429 (Rate Limit Free Models)

Se houver pico de uso em modelos gratuitos (`:free`):
1. O sistema automaticamente aciona os modelos de fallback na seguinte ordem:
   * **Chat**: `nvidia/nemotron-3.5-lightning:free` → `nvidia/nemotron-3-super-120b-a12b:free` → `openrouter/free` → `dots-studio/dots-3-note-preview:free`.
   * **OCR**: `minimax/minimax-m3:free` → `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` → `openrouter/free`.
2. Para forçar a troca manual de modelo primário sem alterar código, ajuste `AI_MODEL` no `.env.local` / Vercel.

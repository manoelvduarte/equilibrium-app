---
name: ai-tools-design
description: Padrões de Zod schemas, aprovação prévia (needsApproval) e execução com JWT para as tools da IA agêntica.
---

# AI Tools Design Skill — Equilibrium

## 1. Princípios de Segurança da IA Agêntica
- **NUNCA usar `service_role`**: As ferramentas da IA executam obrigatoriamente utilizando o cliente Supabase instanciado com o JWT do usuário ativo (`createServerClient`).
- O Postgres RLS é o firewall definitivo da IA. Se a RLS bloquear, a IA falha com segurança.

## 2. Padrão de Approval Prévia (`needsApproval: true`)
- Todas as ferramentas que realizam mutação (`create_transaction`, `update_transaction`, `delete_transaction`, `categorize_transactions`, `update_budget_limit`, `create_category`) possuem `needsApproval: true`.
- Fluxo de Aprovação:
  1. A IA emite a chamada da ferramenta com os parâmetros calculados.
  2. O Vercel AI SDK no frontend intercepta a chamada e exibe um **Card Interativo de Diff** com as alterações propostas.
  3. A ação só é enviada para execução no banco após clique explícito do usuário ("Confirmar / Aplicar").
  4. Toda tentativa e execução é registrada na tabela `ai_action_logs`.

## 3. Schemas Zod Estritos
- Todos os parâmetros de ferramentas devem ser validados por schemas Zod tipados sem uso de `any`.
- Exemplo:
  ```ts
  import { z } from 'zod';

  export const createTransactionToolSchema = z.object({
    accountId: z.string().uuid(),
    categoryId: z.string().uuid().optional(),
    type: z.enum(['income', 'expense', 'transfer']),
    amountCents: z.number().int().positive(),
    description: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    merchant: z.string().optional(),
    notes: z.string().optional(),
  });
  ```

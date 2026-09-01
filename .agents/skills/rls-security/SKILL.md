---
name: rls-security
description: Padrões de Row Level Security (RLS) do Supabase e testes de isolamento multi-tenant para o Equilibrium.
---

# RLS Security Skill — Equilibrium

## 1. Regra de Ouro do Isolamento Multi-Tenant
- Todas as tabelas do schema public possuem `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
- A identificação do tenant é obtida através da função SQL `auth_household()`:
  ```sql
  create or replace function public.auth_household() returns uuid language sql stable as
  $$ select nullif(auth.jwt()->'app_metadata'->>'household_id','')::uuid $$;
  ```
- NUNCA liberar acesso público ou omitir a verificação `household_id = auth_household()`.

## 2. Visibilidade de Contas e Transações entre Casais
- **`private`**: Apenas o proprietário (`owner_id = auth.uid()`) pode visualizar e editar.
- **`balance_only`**: O parceiro pode visualizar o saldo agregado na view `account_balances`, mas NÃO pode listar as transações individuais.
- **`shared`** ou `owner_id IS NULL`: Ambos os membros do household possuem visibilidade e permissão total de leitura.

## 3. Testes Obrigatórios de Isolamento RLS
Antes de promover qualquer alteração de schema ou backend, executar o script de teste de 2 households (`household_a` vs `household_b`).
- Usuário A **deve receber 0 linhas** ao tentar consultar ou mutar qualquer registro criado pelo Usuário B.

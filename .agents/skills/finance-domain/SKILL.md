---
name: finance-domain
description: Diretrizes de domínio financeiro para o Equilibrium — centavos inteiros, imutabilidade, permilagem e remainder distribution.
---

# Finance Domain Skill — Equilibrium

## 1. Valores Monetários Inteiros (`amount_cents`)
- **PROIBIDO**: Uso de `float`, `double`, `decimal` ou `string` para representar valores monetários em qualquer camada do sistema (banco de dados, Zod, TypeScript, Server Actions ou UI).
- **Valores estritamente inteiros positivos**: `amount_cents` deve ser um número inteiro estritamente positivo (> 0).
- **Sinal pelo Tipo**: O sentido do fluxo financeiro é determinado de forma exclusiva pela coluna `type`:
  - `income`: Incrementa o saldo da conta `account_id`.
  - `expense`: Decrementa o saldo da conta `account_id`.
  - `transfer`: Decrementa o saldo da conta `account_id` e incrementa a conta `transfer_to_account_id`.

## 2. Imutabilidade e Versionamento de Transações
- Transações nunca são alteradas diretamente sem preservar o histórico.
- Ao atualizar uma transação:
  1. Incrementa-se a coluna `version` (`version = version + 1`).
  2. Grava-se um snapshot completo do estado anterior em `transaction_history`.
- Soft delete via `deleted_at`: Exclusões marcam a data de remoção, permitindo ação de desfazer (Undo Toast) por pelo menos 5 segundos.

## 3. Rateio de Despesas do Casal em Permilagem (‰) e Remainder Distribution
- Divisões entre os parceiros do household utilizam permilagem (‰), onde 1000‰ representa 100%.
- **Algoritmo de Distribuição do Resto (Remainder Distribution)**:
  Ao dividir `amount_cents` entre múltiplos perfis:
  ```ts
  function calculateSplitCents(amountCents: number, ratios: Record<string, number>): Record<string, number> {
    const profiles = Object.keys(ratios);
    const result: Record<string, number> = {};
    let allocatedSum = 0;
    
    profiles.forEach((profileId, index) => {
      if (index === profiles.length - 1) {
        result[profileId] = amountCents - allocatedSum;
      } else {
        const share = Math.floor((amountCents * ratios[profileId]) / 1000);
        result[profileId] = share;
        allocatedSum += share;
      }
    });
    
    return result;
  }
  ```
- O valor remanescente da divisão inteira vai obrigatoriamente para o primeiro perfil principal, prevenindo discrepâncias monetárias.

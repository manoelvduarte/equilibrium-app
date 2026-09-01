---
name: equilibrium-design
description: Aplica o design system Ledger Editorial do Equilibrium. Usar em TODA criação/alteração de UI.
---

# Equilibrium Design Skill — Ledger Editorial

Esta skill governa todas as decisões visuais, estruturais e de interface do projeto Equilibrium. Consulte a especificação completa em [docs/DESIGN_SPEC.md](../../docs/DESIGN_SPEC.md).

## Regras de Ouro
1. **Neutros Aquecidos**: Uso exclusivo da paleta `paper`, `surface`, `surface-2`, `ink`, `ink-2`, `ink-3`, `hairline`. O uso de cores neutras frias do Tailwind (`slate`, `zinc`, `neutral`) é estritamente proibido.
2. **Tipografia Nobre**:
   - `Fraunces` para KPIs numéricos e títulos h1.
   - `IBM Plex Sans` para textos gerais e tabelas (com numerais tabulares `tnum`).
   - `IBM Plex Mono` para códigos e IDs.
3. **Forma e Raios**: Limite máximo de raio de 12px (`radius-4`, `radius-6`, `radius-10`, `radius-12`). Classes como `rounded-2xl` e `rounded-3xl` são proibidas.
4. **Zero Emojis & Zero Imagens Externas**: Ícones são exclusivamente `lucide-react` (stroke 1.5). Avatares são círculos de iniciais textuais.
5. **Anti-Card**: A aplicação vive em um papel plano contínuo. Cards reais são restritos a modais, dropdowns e superfícies de gráficos.
